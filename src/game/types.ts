export type FigureSpec =
  | { type: "cube"; highlight?: string[] }
  | {
      type: "lines";
      mode: "angle" | "parallel" | "coincident" | "perpendicular" | "skew" | "three";
    };

export type AnswerStatus = "reviewed" | "draft";

export interface BankQuestion {
  id: string;
  level: 1 | 2;
  topic: string;
  stem: string;
  figure?: FigureSpec | null;
  options: string[];
  /** Chỉ số đáp án đúng trong mảng options gốc (0..3). */
  correct: number;
  solution: string[];
  similarId?: string;
  answerStatus: AnswerStatus;
  solutionStatus: AnswerStatus;
  isSimilar: boolean;
  note?: string;
}

export interface PreparedQuestion
  extends Omit<BankQuestion, "correct" | "options"> {
  options: string[];
  /** Chỉ số đáp án đúng sau khi đã trộn options. */
  correctIndex: number;
}

export type RunResult = "win" | "lose_lives" | "lose_timeout";

export interface RunSummary {
  sessionId: string;
  level: 1 | 2;
  startedAt: string;
  endedAt: string;
  totalTimeMs: number;
  wrongCount: number;
  correctCount: number;
  clearedCount: number;
  result: RunResult;
}

export interface GameResultView extends RunSummary {}

export interface MissionMeta {
  level: 1 | 2;
  title: string;
  topic: string;
  description: string;
  monsterId: "slime" | "bat" | "dragon" | "ghost" | "golem" | "robot" | "darklord";
  monsterName: string;
  taunt: string;
}
