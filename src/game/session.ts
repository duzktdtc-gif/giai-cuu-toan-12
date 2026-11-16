import type {
  ActiveRun,
  AttemptRecord,
  SessionRecord,
  SessionResult,
  StudentProfile,
} from "../lib/models";
import type { PlayableQuestion as Question } from "../questions/types";
import { enqueue, saveProfile } from "../lib/storage";
import { requestSync } from "../lib/sync";

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sessionFromRun(profile: StudentProfile, run: ActiveRun, result: SessionResult, endedAt: string | null): SessionRecord {
  return {
    id: run.id,
    studentId: profile.id,
    startedAt: run.startedAt,
    endedAt,
    startLevel: run.startLevel,
    maxLevel: run.cleared,
    result,
    lastActivity: endedAt ?? nowIso(),
  };
}

function queueSession(profile: StudentProfile, run: ActiveRun, result: SessionResult, endedAt: string | null): void {
  enqueue([
    {
      kind: "session",
      student: {
        id: profile.id,
        name: profile.name,
        nameNormalized: profile.nameNormalized,
        className: profile.className,
        classNormalized: profile.classNormalized,
        avatar: profile.avatar,
      },
      session: sessionFromRun(profile, run, result, endedAt),
    },
  ]);
}

function studentSnapshot(profile: StudentProfile) {
  return {
    id: profile.id,
    name: profile.name,
    nameNormalized: profile.nameNormalized,
    className: profile.className,
    classNormalized: profile.classNormalized,
    avatar: profile.avatar,
  };
}

/** Bắt đầu lượt chơi mới; lượt đang dở (nếu có) bị đánh dấu abandoned. */
export function startNewRun(profile: StudentProfile, startLevel: number): StudentProfile {
  const timestamp = nowIso();
  if (profile.activeRun) {
    queueSession(profile, profile.activeRun, "abandoned", timestamp);
  }
  const level = Math.min(Math.max(startLevel, 1), 7);
  const run: ActiveRun = {
    id: randomId(),
    level,
    lives: 3,
    startedAt: timestamp,
    cleared: level - 1,
    startLevel: level,
  };
  const next: StudentProfile = {
    ...profile,
    activeRun: run,
    sessionsCount: profile.sessionsCount + 1,
    lastPlayed: timestamp,
    maxLevel: Math.max(profile.maxLevel, level - 1),
  };
  queueSession(next, run, "in_progress", null);
  saveProfile(next);
  requestSync();
  return next;
}

/** Ghi nhận một lượt trả lời (đúng hoặc sai) và cập nhật tiến trình. */
export function recordAttempt(
  profile: StudentProfile,
  question: Question,
  givenAnswer: string,
  isCorrect: boolean,
  livesLeft: number,
  timeSpentMs: number,
): { profile: StudentProfile; attempt: AttemptRecord } {
  const run = profile.activeRun;
  if (!run) throw new Error("Không có lượt chơi đang hoạt động");
  const timestamp = nowIso();
  const attempt: AttemptRecord = {
    id: randomId(),
    sessionId: run.id,
    studentId: profile.id,
    level: question.level,
    templateId: question.templateId,
    kind: question.kind,
    params: question.params,
    questionText: question.prompt,
    choices: question.choices ?? null,
    givenAnswer,
    correctAnswer: question.answerLatex,
    isCorrect,
    livesLeft,
    timeSpentMs: Math.max(0, Math.round(timeSpentMs)),
    createdAt: timestamp,
  };
  const cleared = isCorrect ? Math.max(run.cleared, run.level) : run.cleared;
  const nextRun: ActiveRun = { ...run, lives: livesLeft, cleared };
  const next: StudentProfile = {
    ...profile,
    activeRun: nextRun,
    totalWrong: profile.totalWrong + (isCorrect ? 0 : 1),
    maxLevel: Math.max(profile.maxLevel, cleared),
    lastPlayed: timestamp,
  };
  enqueue([
    { kind: "attempt", student: studentSnapshot(next), attempt },
    { kind: "session", student: studentSnapshot(next), session: sessionFromRun(next, nextRun, "in_progress", null) },
  ]);
  saveProfile(next);
  requestSync();
  return { profile: next, attempt };
}

/** Sang màn kế tiếp sau khi hạ quái vật. */
export function advanceLevel(profile: StudentProfile): StudentProfile {
  const run = profile.activeRun;
  if (!run || run.level >= 7) return profile;
  const nextRun: ActiveRun = { ...run, level: run.level + 1 };
  const next: StudentProfile = { ...profile, activeRun: nextRun };
  queueSession(next, nextRun, "in_progress", null);
  saveProfile(next);
  requestSync();
  return next;
}

/** Kết thúc lượt chơi (victory / game_over) và xoá activeRun. */
export function finishRun(profile: StudentProfile, result: "victory" | "game_over"): StudentProfile {
  const run = profile.activeRun;
  const timestamp = nowIso();
  if (run) queueSession(profile, run, result, timestamp);
  const next: StudentProfile = { ...profile, activeRun: undefined, lastPlayed: timestamp };
  saveProfile(next);
  requestSync(150);
  return next;
}
