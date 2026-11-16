import { useEffect, useRef, useState } from "react";
import type { Avatar } from "../game/levels";
import { levelMeta, MAX_LEVEL, captiveName, heroName } from "../game/levels";
import { advanceLevel, finishRun, recordAttempt } from "../game/session";
import type { StudentProfile } from "../lib/models";
import { generateSimilar, prepareQuestion, checkShortAnswer, parseNumericAnswer } from "../questions/types";
import type { PlayableQuestion, QuestionTemplate } from "../questions/types";
import { templatesForLevel, templateById } from "../questions";
import { sound } from "../lib/audio";
import { NightScene } from "../components/NightScene";
import { HeroSprite, PixelSprite } from "../components/PixelSprite";
import { MathText, MathBlock } from "../components/MathText";
import { Badge, Button, Hearts, IconButton, Modal, MuteToggle, ProgressDots } from "../components/ui";

interface Props {
  initialProfile: StudentProfile;
  onQuit: (profile: StudentProfile) => void;
  onVictory: (profile: StudentProfile) => void;
  onGameOver: (profile: StudentProfile, lostLevel: number, cleared: number) => void;
}

interface LoadedQuestion {
  question: PlayableQuestion;
  template: QuestionTemplate;
}

function loadQuestion(level: number, template?: QuestionTemplate): LoadedQuestion {
  const chosen = template ?? templatesForLevel(level)[Math.floor(Math.random() * templatesForLevel(level).length)];
  return { question: prepareQuestion(chosen.generate()), template: chosen };
}

export function GameScreen({ initialProfile, onQuit, onVictory, onGameOver }: Props) {
  const run = initialProfile.activeRun;
  if (!run) throw new Error("GameScreen cần activeRun");
  const [profile, setProfile] = useState(initialProfile);
  const [level, setLevel] = useState(run.level);
  const [lives, setLives] = useState(run.lives);
  const [cleared, setCleared] = useState(run.cleared);
  const [loaded, setLoaded] = useState<LoadedQuestion>(() => loadQuestion(run.level));
  const [phase, setPhase] = useState<"answering" | "correct" | "wrong">("answering");
  const [selected, setSelected] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [givenAnswer, setGivenAnswer] = useState("");
  const [heroHurt, setHeroHurt] = useState(false);
  const [monsterHit, setMonsterHit] = useState(false);
  const [monsterDefeated, setMonsterDefeated] = useState(false);
  const [justLost, setJustLost] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [runWrong, setRunWrong] = useState(0);
  const shownAt = useRef(Date.now());
  const timers = useRef<number[]>([]);

  const meta = levelMeta(level);
  const avatar = profile.avatar as Avatar;
  const question = loaded.question;

  function addTimer(callback: () => void, delay: number) {
    const id = window.setTimeout(callback, delay);
    timers.current.push(id);
  }
  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  useEffect(() => {
    if (phase === "answering") shownAt.current = Date.now();
  }, [phase, question.prompt]);

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  function resetInteraction() {
    setSelected(null);
    setInput("");
    setInputError(null);
    setGivenAnswer("");
    setHeroHurt(false);
    setMonsterHit(false);
    setMonsterDefeated(false);
    setJustLost(false);
  }

  function nextLevelQuestion(nextLevel: number) {
    setLoaded(loadQuestion(nextLevel));
    setLevel(nextLevel);
    resetInteraction();
    setPhase("answering");
  }

  function similarQuestion() {
    const next = generateSimilar(loaded.template, question.prompt);
    setLoaded({ question: next, template: loaded.template });
    resetInteraction();
    setPhase("answering");
  }

  function playCorrectSequence(next: () => void) {
    setPhase("correct");
    setMonsterHit(true);
    setMonsterDefeated(true);
    sound.play("correct");
    addTimer(() => sound.play("hit"), 180);
    addTimer(() => sound.play("defeat"), 720);
    addTimer(next, 1900);
  }

  function submitAnswer(isCorrect: boolean, given: string) {
    if (phase !== "answering") return;
    clearTimers();
    const timeSpent = Date.now() - shownAt.current;
    const newLives = isCorrect ? lives : lives - 1;
    const result = recordAttempt(profile, question, given, isCorrect, newLives, timeSpent);
    setProfile(result.profile);
    setGivenAnswer(given);

    if (isCorrect) {
      setCleared(Math.max(cleared, level));
      if (level >= MAX_LEVEL) {
        const ended = finishRun(result.profile, "victory");
        setProfile(ended);
        playCorrectSequence(() => onVictory(ended));
      } else {
        const advanced = advanceLevel(result.profile);
        setProfile(advanced);
        playCorrectSequence(() => nextLevelQuestion(level + 1));
      }
      return;
    }

    setRunWrong((value) => value + 1);
    setLives(newLives);
    setPhase("wrong");
    setHeroHurt(true);
    setJustLost(true);
    sound.play("wrong");
    addTimer(() => sound.play("hit"), 220);
    addTimer(() => setHeroHurt(false), 650);
    addTimer(() => setJustLost(false), 1100);
  }

  function choose(index: number) {
    if (phase !== "answering" || !question.choices) return;
    const choice = question.choices[index];
    setSelected(index);
    submitAnswer(choice.isCorrect, choice.latex);
  }

  function submitShort(event: React.FormEvent) {
    event.preventDefault();
    if (phase !== "answering" || question.kind !== "short") return;
    const value = parseNumericAnswer(input);
    if (value === null) {
      setInputError("Chưa đọc được số. Con nhập ví dụ 12, 3.5 hoặc 7/6 nhé.");
      return;
    }
    setInputError(null);
    submitAnswer(checkShortAnswer(question, input), input.trim());
  }

  function handleReviewAction() {
    if (lives <= 0) {
      const ended = finishRun(profile, "game_over");
      setProfile(ended);
      onGameOver(ended, level, cleared);
      return;
    }
    similarQuestion();
  }

  function confirmQuit() {
    clearTimers();
    setQuitOpen(false);
    onQuit(profile);
  }

  const isBoss = level === MAX_LEVEL;
  const monsterHp = monsterDefeated ? 0 : 100;

  return (
    <NightScene className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-3 pb-6 pt-3 sm:px-5">
        <header className="flex items-center justify-between gap-2">
          <IconButton label="Về menu (lưu tiến trình)" onClick={() => setQuitOpen(true)}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </IconButton>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-lilac-300">
              Màn {level}/{MAX_LEVEL}
            </span>
            <ProgressDots level={level} cleared={cleared} />
          </div>
          <div className="flex items-center gap-2">
            <Hearts lives={lives} animateLost={justLost} />
            <MuteToggle />
          </div>
        </header>

        <section className="mt-3 overflow-hidden rounded-2xl border border-lilac-400/15 bg-gradient-to-b from-[#2a1350] via-[#1a0d38] to-[#100722]">
          <div className="flex items-center justify-between gap-3 px-3 pt-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge tone={isBoss ? "rose" : "gold"}>{isBoss ? "BOSS" : `Quái vật ${level}`}</Badge>
                <span className="truncate text-sm font-bold text-white">{meta.monsterName}</span>
              </div>
              <p className="mt-0.5 truncate text-[11px] italic text-lilac-300">“{meta.taunt}”</p>
            </div>
            <div className="w-28 shrink-0 sm:w-40">
              <div className="mb-1 flex justify-between text-[10px] font-semibold text-lilac-300">
                <span>HP</span>
                <span>{monsterHp}%</span>
              </div>
              <div className="hp-track" role="progressbar" aria-valuenow={monsterHp} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className={`hp-fill ${monsterHp === 0 ? "from-rose-400 to-rose-300" : ""}`}
                  style={{ width: `${monsterHp}%` }}
                />
              </div>
            </div>
          </div>

          <div className="relative h-56 sm:h-64">
            <div className="bg-stars absolute inset-0 opacity-50" />
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0b0518] via-[#0b0518]/80 to-transparent" />
            <div className="absolute bottom-3 left-3 sm:left-6">
              <div className={heroHurt ? "animate-hero-hurt" : ""}>
                <HeroSprite avatar={avatar} className="h-28 w-24 drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)] sm:h-32 sm:w-28" />
              </div>
              <p className="mt-1 text-center text-[10px] font-semibold text-lilac-300">{heroName(avatar)}</p>
            </div>
            <div className="absolute bottom-3 right-3 sm:right-6">
              <div className={`${monsterHit ? "animate-monster-hit" : ""} ${monsterDefeated ? "animate-defeat" : "animate-bob"}`}>
                <PixelSprite
                  id={meta.monsterId}
                  title={meta.monsterName}
                  className="h-32 w-28 drop-shadow-[0_10px_18px_rgba(0,0,0,0.6)] sm:h-36 sm:w-32"
                />
              </div>
              <p className="mt-1 text-center text-[10px] font-semibold text-rose-300">{meta.monsterName}</p>
            </div>

            {phase === "correct" && (
              <div className="absolute inset-0 grid place-items-center bg-ink-950/30">
                <div className="animate-pop rounded-2xl border border-gold-400/40 bg-ink-900/90 px-5 py-3 text-center shadow-2xl">
                  <p className="text-lg font-extrabold text-gold-300">
                    {isBoss ? "BOSS ĐÃ BỊ HẠ!" : "HẠ GỤC!"}
                  </p>
                  <p className="text-xs text-lilac-200">
                    {isBoss ? `Cứu được ${captiveName(avatar)}!` : `Mở khoá ${meta.reward}`}
                  </p>
                </div>
              </div>
            )}
            {isBoss && phase !== "correct" && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 text-3xl" aria-hidden>
                👑
              </div>
            )}
          </div>
        </section>

        <section className="card mt-3 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge tone="lilac">Màn {level}</Badge>
            <span className="text-[11px] font-medium text-lilac-300">{question.title}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wide text-lilac-300/70">
              {question.kind === "mc" ? "Trắc nghiệm" : "Trả lời ngắn"}
            </span>
          </div>

          <MathText text={question.prompt} className="block text-[15px] leading-relaxed text-white sm:text-base" />

          {phase === "answering" && question.kind === "mc" && question.choices && (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {question.choices.map((choice, index) => {
                const letter = String.fromCharCode(65 + index);
                return (
                  <button
                    key={`${index}-${choice.latex}`}
                    type="button"
                    onClick={() => choose(index)}
                    className="group flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-lilac-400/20 bg-ink-950/50 p-2.5 text-left transition hover:border-gold-400/60 hover:bg-ink-900 active:scale-[0.99]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-700 text-sm font-bold text-lilac-200 group-hover:bg-gold-400 group-hover:text-ink-950">
                      {letter}
                    </span>
                    <span className="min-w-0 flex-1 text-sm text-white">
                      <MathText text={`$${choice.latex}$`} />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {phase === "answering" && question.kind === "short" && (
            <form className="mt-4" onSubmit={submitShort}>
              <label className="label" htmlFor="short-answer">
                Nhập đáp án
              </label>
              <div className="flex gap-2">
                <input
                  id="short-answer"
                  className="field flex-1 text-lg"
                  inputMode="decimal"
                  enterKeyHint="done"
                  autoComplete="off"
                  placeholder="Ví dụ: 12 ; 3,5 ; 7/6"
                  value={input}
                  onChange={(event) => {
                    setInput(event.target.value);
                    setInputError(null);
                  }}
                  disabled={phase !== "answering"}
                />
                <Button type="submit" className="shrink-0 px-5">
                  Gửi
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-lilac-300/70">
                Chấp nhận dấu phẩy hoặc dấu chấm, phân số dạng a/b, sai số nhỏ 0,01.
              </p>
              {inputError && <p className="mt-1 text-sm text-rose-300">{inputError}</p>}
            </form>
          )}

          {phase === "wrong" && (
            <div className="mt-4 animate-fade-up">
              <div className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-3">
                <p className="text-sm font-bold text-rose-300">
                  {lives <= 0 ? "Con đã mất trái tim cuối cùng!" : "Chưa đúng! Con mất 1 trái tim."}
                </p>
                <p className="mt-1 text-xs text-lilac-200">
                  Đáp án đúng:{" "}
                  <span className="text-base font-semibold text-white">
                    <MathText text={`$${question.answerLatex}$`} />
                  </span>
                </p>
                {givenAnswer && (
                  <p className="mt-0.5 text-xs text-lilac-300">
                    Con đã chọn: <MathText text={question.kind === "mc" ? `$${givenAnswer}$` : givenAnswer} />
                  </p>
                )}
              </div>

              <div className="mt-3">
                <h3 className="text-sm font-bold text-gold-300">Lời giải từng bước</h3>
                <ol className="mt-2 space-y-2">
                  {question.solution.map((step, index) => (
                    <li key={index} className="flex gap-2 text-sm leading-relaxed text-lilac-200">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac-400/15 text-[11px] font-bold text-lilac-300">
                        {index + 1}
                      </span>
                      <MathText text={step} className="min-w-0" />
                    </li>
                  ))}
                </ol>
              </div>

              <Button className="mt-4 w-full py-3.5" onClick={handleReviewAction}>
                {lives <= 0 ? "Xem kết quả" : "Làm bài tương tự"} <span aria-hidden>➜</span>
              </Button>
              {lives > 0 && (
                <p className="mt-1.5 text-center text-[11px] text-lilac-300/60">
                  Bài mới cùng dạng, khác số liệu. Còn {lives} trái tim.
                </p>
              )}
            </div>
          )}

          {phase === "correct" && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-mint-400/25 bg-mint-400/10 p-3 text-sm text-mint-300">
                Chính xác! Quái vật đã bị hạ.
              </div>
              <div className="rounded-xl border border-lilac-400/15 bg-ink-950/40 p-3 text-xs text-lilac-300">
                Đang mở khoá màn tiếp theo...
              </div>
            </div>
          )}
        </section>

        <p className="mt-auto pt-3 text-center text-[10px] text-lilac-300/50">
          {runWrong > 0 ? `Lượt này: ${runWrong} lần sai · ` : ""}
          Tiến trình tự lưu, con có thể quay lại sau.
        </p>
      </div>

      <Modal open={quitOpen} title="Về menu?" onClose={() => setQuitOpen(false)}>
        <p className="text-sm leading-relaxed text-lilac-200">
          Tiến trình đang chơi được lưu tự động. Khi quay lại với cùng họ tên và lớp, con sẽ tiếp tục từ màn {level} với{" "}
          {lives} trái tim.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => setQuitOpen(false)}>
            Ở lại chơi
          </Button>
          <Button variant="danger" onClick={confirmQuit}>
            Về menu
          </Button>
        </div>
      </Modal>
    </NightScene>
  );
}
