import { useEffect, useRef, useState } from "react";
import type { Avatar } from "../game/levels";
import { heroLabel, missionMeta } from "../game/levels";
import {
  MAX_LIVES,
  PAUSE_TIMER_ON_EXPLANATION,
  QUESTIONS_PER_RUN,
  TIME_LIMIT_MS,
  afterCorrectAction,
  afterWrongAction,
  findSimilar,
  formatClock,
  prepareQuestion,
  prepareRun,
  remainingFromDeadline,
  timeoutDuringExplanation,
} from "../game/engine";
import { abandonRun, createRun, finishRun, recordAttempt, type RunContext, type RunTotals } from "../game/session";
import type { BankQuestion, GameResultView, PreparedQuestion, RunResult } from "../game/types";
import type { StudentProfile } from "../lib/models";
import { sound } from "../lib/audio";
import { NightScene } from "../components/NightScene";
import { HeroSprite, PixelSprite } from "../components/PixelSprite";
import { MathText } from "../components/MathText";
import { Figure } from "../components/Figure";
import { Badge, Button, Hearts, IconButton, Modal, MuteToggle } from "../components/ui";

interface Props {
  profile: StudentProfile;
  level: 1 | 2;
  bank: BankQuestion[];
  onFinish: (profile: StudentProfile, result: GameResultView) => void;
  onQuit: (profile: StudentProfile) => void;
}

interface ReviewState {
  chosenText: string;
  correctText: string;
  isSimilar: boolean;
}

interface Stats {
  lives: number;
  wrongCount: number;
  correctCount: number;
  clearedCount: number;
}

const INITIAL_STATS: Stats = { lives: MAX_LIVES, wrongCount: 0, correctCount: 0, clearedCount: 0 };

export function GameScreen({ profile, level, bank, onFinish, onQuit }: Props) {
  const [run] = useState<RunContext>(() => createRun(level));
  const [questions] = useState<PreparedQuestion[]>(() => prepareRun(bank));
  const [mainIndex, setMainIndex] = useState(0);
  const [similar, setSimilar] = useState<PreparedQuestion | null>(null);
  const [phase, setPhase] = useState<"answering" | "correct" | "wrong" | "finished">("answering");
  const [selected, setSelected] = useState<number | null>(null);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [remaining, setRemaining] = useState(TIME_LIMIT_MS);
  const [heroHurt, setHeroHurt] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [justLost, setJustLost] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);

  const deadlineRef = useRef(Date.now() + TIME_LIMIT_MS);
  const pausedRemainingRef = useRef<number | null>(null);
  const remainingRef = useRef(TIME_LIMIT_MS);
  const shownAtRef = useRef(Date.now());
  const statsRef = useRef<Stats>(INITIAL_STATS);
  const finishedRef = useRef(false);
  const phaseRef = useRef(phase);
  const timersRef = useRef<number[]>([]);
  const finishRef = useRef<(result: RunResult) => void>(() => undefined);
  phaseRef.current = phase;

  const current = similar ?? questions[mainIndex];
  const similarActive = similar !== null;
  const hasSimilar = level === 1 && findSimilar(bank, current.similarId) !== null;
  const meta = missionMeta(level);
  const avatar = profile.avatar as Avatar;
  const isLastSlot = mainIndex + 1 >= questions.length;
  const hp = Math.max(0, 100 - mainIndex * 20 - (phase === "correct" ? 20 : 0));

  function addTimer(callback: () => void, delay: number) {
    const id = window.setTimeout(callback, delay);
    timersRef.current.push(id);
  }

  function clearTimers() {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }

  function pauseTimer() {
    if (!PAUSE_TIMER_ON_EXPLANATION || pausedRemainingRef.current !== null) return;
    const left = Math.max(0, deadlineRef.current - Date.now());
    pausedRemainingRef.current = left;
    remainingRef.current = left;
    setRemaining(left);
  }

  function resumeTimer(): boolean {
    if (!PAUSE_TIMER_ON_EXPLANATION) return true;
    if (pausedRemainingRef.current === null) return true;
    const left = pausedRemainingRef.current;
    pausedRemainingRef.current = null;
    deadlineRef.current = Date.now() + left;
    remainingRef.current = left;
    setRemaining(left);
    if (left <= 0) {
      finishRef.current("lose_timeout");
      return false;
    }
    return true;
  }

  function currentTotals(result: RunResult): RunTotals {
    return {
      totalTimeMs: result === "lose_timeout" ? TIME_LIMIT_MS : Math.max(0, TIME_LIMIT_MS - remainingRef.current),
      wrongCount: statsRef.current.wrongCount,
      correctCount: statsRef.current.correctCount,
      clearedCount: statsRef.current.clearedCount,
    };
  }

  function finish(result: RunResult) {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    const totals = currentTotals(result);
    const endedAt = new Date().toISOString();
    const ended = finishRun(profile, run, result, totals);
    setPhase("finished");
    sound.play(result === "win" ? "victory" : "gameover");
    onFinish(ended, {
      sessionId: run.id,
      level,
      startedAt: run.startedAt,
      endedAt,
      result,
      ...totals,
    });
  }
  finishRef.current = finish;

  useEffect(() => {
    const id = window.setInterval(() => {
      if (finishedRef.current) return;
      if (pausedRemainingRef.current !== null) {
        setRemaining(pausedRemainingRef.current);
        return;
      }
      const left = remainingFromDeadline(deadlineRef.current);
      remainingRef.current = left;
      setRemaining(left);
      const timeout = timeoutDuringExplanation({
        expired: left <= 0,
        pauseOnExplanation: PAUSE_TIMER_ON_EXPLANATION,
        showingExplanation: phaseRef.current === "correct" || phaseRef.current === "wrong",
      });
      if (timeout) finishRef.current(timeout);
    }, 250);
    return () => {
      window.clearInterval(id);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase === "answering") shownAtRef.current = Date.now();
  }, [phase, current.id, similarActive]);

  function resetInteraction() {
    setSelected(null);
    setReview(null);
    setHeroHurt(false);
    setMonsterHit(false);
    setJustLost(false);
  }

  function completeSlot() {
    const nextStats = {
      ...statsRef.current,
      clearedCount: Math.min(QUESTIONS_PER_RUN, statsRef.current.clearedCount + 1),
    };
    statsRef.current = nextStats;
    setStats(nextStats);
  }

  function advanceMain() {
    if (finishedRef.current) return;
    if (mainIndex + 1 >= questions.length) {
      finish("win");
      return;
    }
    setMainIndex((value) => value + 1);
    setSimilar(null);
    resetInteraction();
    setPhase("answering");
    shownAtRef.current = Date.now();
    resumeTimer();
  }

  function loadSimilar() {
    const target = findSimilar(bank, current.similarId);
    if (!target) {
      completeSlot();
      advanceMain();
      return;
    }
    setSimilar(prepareQuestion(target));
    resetInteraction();
    setPhase("answering");
    shownAtRef.current = Date.now();
    resumeTimer();
  }

  function choose(index: number) {
    if (phase !== "answering" || finishedRef.current) return;
    if (pausedRemainingRef.current === null && remainingFromDeadline(deadlineRef.current) <= 0) {
      finish("lose_timeout");
      return;
    }
    clearTimers();
    const isCorrect = index === current.correctIndex;
    const chosenText = current.options[index] ?? "";
    const correctText = current.options[current.correctIndex] ?? "";
    const nextLives = isCorrect ? statsRef.current.lives : statsRef.current.lives - 1;
    recordAttempt({
      profile,
      run,
      question: current,
      chosenIndex: index,
      chosenText,
      livesLeft: nextLives,
      timeSpentMs: Date.now() - shownAtRef.current,
    });
    setSelected(index);
    setReview({ chosenText, correctText, isSimilar: similarActive });

    if (isCorrect) {
      const nextStats = {
        ...statsRef.current,
        correctCount: statsRef.current.correctCount + 1,
        clearedCount: Math.min(QUESTIONS_PER_RUN, statsRef.current.clearedCount + 1),
      };
      statsRef.current = nextStats;
      setStats(nextStats);
      setPhase("correct");
      pauseTimer();
      setMonsterHit(true);
      sound.play("correct");
      addTimer(() => sound.play("hit"), 160);
      addTimer(() => setMonsterHit(false), 600);
      addTimer(() => {
        if (afterCorrectAction({ isLastQuestion: mainIndex + 1 >= questions.length }) === "win") {
          finish("win");
        } else {
          advanceMain();
        }
      }, 1400);
      return;
    }

    const nextStats = {
      ...statsRef.current,
      lives: nextLives,
      wrongCount: statsRef.current.wrongCount + 1,
    };
    statsRef.current = nextStats;
    setStats(nextStats);
    setPhase("wrong");
    pauseTimer();
    setHeroHurt(true);
    setJustLost(true);
    sound.play("wrong");
    addTimer(() => sound.play("hit"), 220);
    addTimer(() => setHeroHurt(false), 700);
    addTimer(() => setJustLost(false), 1100);
  }

  function handleReviewAction() {
    if (phase !== "wrong" || finishedRef.current) return;
    const action = afterWrongAction({
      lives: statsRef.current.lives,
      isSimilarActive: similarActive,
      hasSimilar,
      isLastQuestion: mainIndex + 1 >= questions.length,
    });
    if (action === "finish_lose") finish("lose_lives");
    else if (action === "similar") loadSimilar();
    else {
      // Màn 2 (hoặc câu không có tương tự): sai vẫn đi tiếp, tính là đã hoàn thành ô câu gốc.
      if (!similarActive) completeSlot();
      if (action === "win") finish("win");
      else advanceMain();
    }
  }

  function confirmQuit() {
    if (finishedRef.current) return;
    finishedRef.current = true;
    clearTimers();
    const totals: RunTotals = {
      totalTimeMs: Math.max(0, TIME_LIMIT_MS - remainingRef.current),
      wrongCount: statsRef.current.wrongCount,
      correctCount: statsRef.current.correctCount,
      clearedCount: statsRef.current.clearedCount,
    };
    const ended = abandonRun(profile, run, totals);
    setQuitOpen(false);
    onQuit(ended);
  }

  const reviewButtonLabel =
    stats.lives <= 0 ? "Xem kết quả" : similarActive ? "Câu tiếp theo" : hasSimilar ? "Làm câu tương tự" : "Câu tiếp theo";

  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-3 pb-6 pt-3 sm:px-5">
        <header className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconButton label="Thoát lượt chơi" onClick={() => setQuitOpen(true)}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </IconButton>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold uppercase tracking-widest text-lilac-300">
                {meta.title} · Câu {mainIndex + 1}/{QUESTIONS_PER_RUN}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] text-lilac-300/80">
                {similarActive ? <Badge tone="lilac">Câu tương tự</Badge> : <span>Câu gốc</span>}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              role="timer"
              aria-label={`Còn ${formatClock(remaining)}`}
              className={`rounded-lg px-2 py-1 font-mono text-sm font-bold tabular-nums ${
                remaining <= 60_000 ? "bg-rose-400/15 text-rose-300" : "bg-gold-400/15 text-gold-300"
              }`}
            >
              {formatClock(remaining)}
            </span>
            <Hearts lives={stats.lives} max={MAX_LIVES} animateLost={justLost} />
            <MuteToggle />
          </div>
        </header>

        <div className="mt-2 flex gap-1" aria-hidden>
          {Array.from({ length: QUESTIONS_PER_RUN }, (_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                index < mainIndex ? "bg-mint-400" : index === mainIndex ? "bg-gold-400" : "bg-lilac-400/20"
              }`}
            />
          ))}
        </div>

        <section className="mt-3 overflow-hidden rounded-2xl border border-lilac-400/15 bg-gradient-to-b from-[#2a1350] via-[#1a0d38] to-[#100722]">
          <div className="flex items-center justify-between gap-3 px-3 pt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone={level === 2 ? "rose" : "gold"}>{meta.title}</Badge>
                <span className="truncate text-sm font-bold text-white">{meta.monsterName}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] italic text-lilac-300">“{meta.taunt}”</p>
            </div>
            <div className="w-28 shrink-0 sm:w-36">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-lilac-300">
                <span>HP</span>
                <span>{hp}%</span>
              </div>
              <div className="hp-track" role="progressbar" aria-valuenow={hp} aria-valuemin={0} aria-valuemax={100}>
                <div className={`hp-fill ${hp === 0 ? "from-rose-400 to-rose-300" : ""}`} style={{ width: `${hp}%` }} />
              </div>
            </div>
          </div>

          <div className="relative h-44 sm:h-48">
            <div className="bg-stars absolute inset-0 opacity-50" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0b0518] via-[#0b0518]/80 to-transparent" />
            <div className="absolute bottom-2 left-3 sm:left-6">
              <div className={heroHurt ? "animate-hero-hurt" : ""}>
                <HeroSprite avatar={avatar} className="h-24 w-20 drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)] sm:h-28 sm:w-24" />
              </div>
              <p className="mt-0.5 max-w-[6rem] truncate text-center text-[10px] font-semibold text-lilac-300" title={profile.name}>
                {heroLabel(avatar, profile.name)}
              </p>
            </div>
            <div className="absolute bottom-2 right-3 sm:right-6">
              <div className={monsterHit ? "animate-monster-hit" : "animate-bob"}>
                <PixelSprite
                  id={meta.monsterId}
                  title={meta.monsterName}
                  className="h-28 w-24 drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)] sm:h-32 sm:w-28"
                />
              </div>
              <p className="mt-0.5 text-center text-[10px] font-semibold text-rose-300">{meta.monsterName}</p>
            </div>

            {phase === "correct" && (
              <div className="absolute inset-0 grid place-items-center bg-ink-950/30">
                <div className="animate-pop rounded-2xl border border-mint-400/40 bg-ink-900/90 px-5 py-3 text-center shadow-2xl">
                  <p className="text-lg font-extrabold text-mint-300">{isLastSlot && !similarActive ? "HẠ GỤC!" : "ĐÚNG!"}</p>
                  <p className="text-xs text-lilac-200">
                    {isLastSlot && !similarActive ? "Quái vật đã gục ngã!" : "Quái vật mất 20% máu"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card mt-3 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="lilac">{meta.title}</Badge>
            <span className="text-[11px] font-medium text-lilac-300">
              {similarActive ? "Câu tương tự" : `Câu ${mainIndex + 1} / ${QUESTIONS_PER_RUN}`}
            </span>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-lilac-300/70">Trắc nghiệm</span>
          </div>

          <MathText text={current.stem} className="block text-[15px] leading-relaxed text-white sm:text-base" />

          {current.figure ? <Figure spec={current.figure} className="mt-3" /> : null}

          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {current.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isCorrectOption = index === current.correctIndex;
              const isChosen = index === selected;
              const answered = phase === "correct" || phase === "wrong";
              const stateClass = answered
                ? isCorrectOption
                  ? "border-mint-400/70 bg-mint-400/10"
                  : isChosen
                    ? "border-rose-400/70 bg-rose-400/10"
                    : "border-lilac-400/10 bg-ink-950/30 opacity-60"
                : "border-lilac-400/20 bg-ink-950/50 hover:border-gold-400/60 hover:bg-ink-900 active:scale-[0.99]";
              return (
                <button
                  key={`${index}-${option}`}
                  type="button"
                  disabled={phase !== "answering"}
                  onClick={() => choose(index)}
                  className={`group flex min-h-14 w-full items-center gap-3 rounded-xl border-2 p-2.5 text-left transition ${stateClass}`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm font-bold ${
                      answered && isCorrectOption
                        ? "bg-mint-400 text-ink-950"
                        : answered && isChosen
                          ? "bg-rose-400 text-ink-950"
                          : "bg-ink-700 text-lilac-200 group-hover:bg-gold-400 group-hover:text-ink-950"
                    }`}
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-white">
                    <MathText text={option} />
                  </span>
                </button>
              );
            })}
          </div>

          {phase === "wrong" && review && (
            <div className="mt-4 animate-fade-up">
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3">
                <p className="text-sm font-bold text-rose-300">
                  {stats.lives <= 0 ? "Con đã mất trái tim cuối cùng!" : "Chưa đúng! Con mất 1 trái tim."}
                </p>
                <p className="mt-1 text-xs text-lilac-200">
                  Đáp án đúng:{" "}
                  <span className="text-base font-semibold text-white">
                    <MathText text={review.correctText} />
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-lilac-300">
                  Con đã chọn: <MathText text={review.chosenText} />
                </p>
              </div>

              {current.solution.length > 0 ? (
                <div className="mt-3">
                  <h3 className="text-sm font-bold text-gold-300">Lời giải</h3>
                  <ol className="mt-2 space-y-2">
                    {current.solution.map((step, index) => (
                      <li key={index} className="flex gap-2 text-sm leading-relaxed text-lilac-200">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac-400/15 text-[11px] font-bold text-lilac-300">
                          {index + 1}
                        </span>
                        <MathText text={step} className="min-w-0" />
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="mt-3 text-sm text-lilac-300">Câu này chưa có lời giải chi tiết.</p>
              )}

              <Button className="mt-4 w-full py-3.5" onClick={handleReviewAction} disabled={phase !== "wrong"}>
                {reviewButtonLabel} <span aria-hidden>➜</span>
              </Button>
              {stats.lives > 0 && (
                <p className="mt-1.5 text-center text-[11px] text-lilac-300/60">
                  {similarActive
                    ? "Câu tương tự thay cho câu gốc vừa sai. Làm xong sẽ chuyển câu tiếp theo."
                    : hasSimilar
                      ? `Câu mới cùng dạng. Còn ${stats.lives} trái tim.`
                      : `Còn ${stats.lives} trái tim. Chuyển sang câu tiếp theo.`}
                </p>
              )}
            </div>
          )}

          {phase === "correct" && (
            <div className="mt-4 rounded-xl border border-mint-400/25 bg-mint-400/10 p-3 text-sm text-mint-300">
              Chính xác! {isLastSlot && !similarActive ? "Đang kết thúc lượt..." : "Chuẩn bị câu tiếp theo..."}
            </div>
          )}
        </section>

        <p className="mt-auto pt-3 text-center text-[10px] text-lilac-300/50">
          {stats.wrongCount > 0 ? `Lượt này: ${stats.wrongCount} lần sai · ` : ""}
          Không lưu tiến trình giữa chừng.
        </p>
      </div>

      <Modal open={quitOpen} title="Thoát lượt chơi?" onClose={() => setQuitOpen(false)}>
        <p className="text-sm leading-relaxed text-lilac-200">
          Lượt đang chơi sẽ kết thúc và được ghi là <span className="font-semibold text-white">bỏ dở</span>. Không thể
          tiếp tục từ câu đang làm. Nếu muốn chơi tiếp, hãy ở lại.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setQuitOpen(false)}>
            Ở lại chơi
          </Button>
          <Button variant="danger" onClick={confirmQuit}>
            Thoát lượt
          </Button>
        </div>
      </Modal>
    </NightScene>
  );
}
