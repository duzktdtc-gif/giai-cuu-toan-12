import type { Avatar } from "../game/levels";

export interface StudentIdentity {
  id: string;
  name: string;
  nameNormalized: string;
  className: string;
  classNormalized: string;
  avatar: Avatar;
}

export interface StudentProfile extends StudentIdentity {
  sessionsCount: number;
  createdAt: string;
  lastPlayed: string;
  runsByLevel: Record<string, number>;
  winsByLevel: Record<string, number>;
}

export type SessionResult =
  | "in_progress"
  | "win"
  | "lose_lives"
  | "lose_timeout"
  | "abandoned"
  // Giá trị của phiên bản 7 màn cũ, giữ để hiển thị dữ liệu lịch sử.
  | "victory"
  | "game_over";

export interface SessionRecord {
  id: string;
  studentId: string;
  level: number;
  startedAt: string;
  endedAt: string | null;
  totalTimeMs: number;
  wrongCount: number;
  correctCount: number;
  clearedCount: number;
  result: SessionResult;
  lastActivity: string;
}

export interface AttemptRecord {
  id: string;
  sessionId: string;
  studentId: string;
  level: number;
  questionId: string;
  isSimilar: boolean;
  questionText: string;
  options: string[];
  chosenIndex: number | null;
  chosenText: string;
  correctIndex: number | null;
  correctText: string;
  isCorrect: boolean;
  livesLeft: number;
  timeSpentMs: number;
  createdAt: string;
}

export type SyncQueueItem =
  | { kind: "session"; student: StudentIdentity; session: SessionRecord }
  | { kind: "attempt"; student: StudentIdentity; attempt: AttemptRecord };

export interface TeacherStudentRow {
  id: string;
  displayName: string;
  className: string;
  avatar: string;
  sessionsCount: number;
  winCount: number;
  loseLivesCount: number;
  loseTimeoutCount: number;
  totalTimeMs: number;
  wrongCount: number;
  correctCount: number;
  lastLevel: number;
  levelsPlayed: number[];
  lastPlayed: string | null;
  createdAt: string;
}

export interface LevelStat {
  level: number;
  attempts: number;
  wrong: number;
  wrongRate: number;
  sessions: number;
  wins: number;
  avgTimeMs: number;
}

export interface QuestionStat {
  questionId: string;
  level: number;
  attempts: number;
  wrong: number;
  wrongRate: number;
  similarAttempts: number;
}

export interface TeacherDashboard {
  students: TeacherStudentRow[];
  levelStats: LevelStat[];
  questionStats: QuestionStat[];
  generatedAt: string;
  answerReviewRequired: boolean;
}

export interface TeacherStudentDetail {
  student: TeacherStudentRow;
  sessions: SessionRecord[];
  attempts: AttemptRecord[];
}
