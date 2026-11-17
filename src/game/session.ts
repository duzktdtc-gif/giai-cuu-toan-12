import type { PreparedQuestion, RunResult } from "../game/types";
import type {
  AttemptRecord,
  SessionRecord,
  SessionResult,
  StudentIdentity,
  StudentProfile,
} from "../lib/models";
import { enqueue, saveProfile } from "../lib/storage";
import { requestSync } from "../lib/sync";

export interface RunContext {
  id: string;
  level: 1 | 2;
  startedAt: string;
}

export interface RunTotals {
  totalTimeMs: number;
  wrongCount: number;
  correctCount: number;
  clearedCount: number;
}

export interface RecordAttemptInput {
  profile: StudentProfile;
  run: RunContext;
  question: PreparedQuestion;
  chosenIndex: number;
  chosenText: string;
  livesLeft: number;
  timeSpentMs: number;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  const cryptoApi =
    typeof crypto !== "undefined"
      ? (crypto as unknown as {
          randomUUID?: () => string;
          getRandomValues?: (array: Uint8Array) => Uint8Array;
        })
      : null;
  if (cryptoApi?.randomUUID) return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function studentSnapshot(profile: StudentProfile): StudentIdentity {
  return {
    id: profile.id,
    name: profile.name,
    nameNormalized: profile.nameNormalized,
    className: profile.className,
    classNormalized: profile.classNormalized,
    avatar: profile.avatar,
  };
}

function sessionFromRun(
  profile: StudentProfile,
  run: RunContext,
  result: SessionResult,
  totals: RunTotals,
  endedAt: string | null,
): SessionRecord {
  return {
    id: run.id,
    studentId: profile.id,
    level: run.level,
    startedAt: run.startedAt,
    endedAt,
    totalTimeMs: Math.max(0, Math.round(totals.totalTimeMs)),
    wrongCount: Math.max(0, Math.round(totals.wrongCount)),
    correctCount: Math.max(0, Math.round(totals.correctCount)),
    clearedCount: Math.max(0, Math.min(5, Math.round(totals.clearedCount))),
    result,
    lastActivity: endedAt ?? nowIso(),
  };
}

/** Bắt đầu một lượt mới. Không lưu tiến trình giữa chừng. */
export function createRun(level: 1 | 2): RunContext {
  return { id: randomId(), level, startedAt: nowIso() };
}

/** Ghi nhận một lần trả lời; Edge Function sẽ tự tạo session nếu chưa có. */
export function recordAttempt(input: RecordAttemptInput): AttemptRecord {
  const { profile, run, question, chosenIndex, chosenText, livesLeft, timeSpentMs } = input;
  const isCorrect = chosenIndex === question.correctIndex;
  const attempt: AttemptRecord = {
    id: randomId(),
    sessionId: run.id,
    studentId: profile.id,
    level: run.level,
    questionId: question.id,
    isSimilar: question.isSimilar,
    questionText: question.stem,
    options: question.options,
    chosenIndex,
    chosenText,
    correctIndex: question.correctIndex,
    correctText: question.options[question.correctIndex],
    isCorrect,
    livesLeft: Math.max(0, livesLeft),
    timeSpentMs: Math.max(0, Math.round(timeSpentMs)),
    createdAt: nowIso(),
  };
  enqueue([{ kind: "attempt", student: studentSnapshot(profile), attempt }]);
  requestSync();
  return attempt;
}

function endRun(
  profile: StudentProfile,
  run: RunContext,
  result: SessionResult,
  totals: RunTotals,
): StudentProfile {
  const timestamp = nowIso();
  const runsByLevel = { ...profile.runsByLevel, [run.level]: (profile.runsByLevel[run.level] ?? 0) + 1 };
  const winsByLevel = {
    ...profile.winsByLevel,
    [run.level]: (profile.winsByLevel[run.level] ?? 0) + (result === "win" ? 1 : 0),
  };
  const next: StudentProfile = {
    ...profile,
    sessionsCount: profile.sessionsCount + 1,
    runsByLevel,
    winsByLevel,
    lastPlayed: timestamp,
  };
  const session = sessionFromRun(profile, run, result, totals, timestamp);
  enqueue([{ kind: "session", student: studentSnapshot(next), session }]);
  saveProfile(next);
  requestSync(150);
  return next;
}

/** Kết thúc lượt với thắng/thua và cập nhật thống kê cục bộ. */
export function finishRun(
  profile: StudentProfile,
  run: RunContext,
  result: RunResult,
  totals: RunTotals,
): StudentProfile {
  return endRun(profile, run, result, totals);
}

/** Thoát giữa chừng: ghi nhận lượt bỏ dở, không cho tiếp tục. */
export function abandonRun(profile: StudentProfile, run: RunContext, totals: RunTotals): StudentProfile {
  return endRun(profile, run, "abandoned", totals);
}
