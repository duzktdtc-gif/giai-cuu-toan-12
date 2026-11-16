import type { Avatar } from "../game/levels";

export interface StudentIdentity {
  id: string;
  name: string;
  nameNormalized: string;
  className: string;
  classNormalized: string;
  avatar: Avatar;
}

export interface ActiveRun {
  id: string;
  level: number;
  lives: number;
  startedAt: string;
  cleared: number;
  startLevel: number;
}

export interface StudentProfile extends StudentIdentity {
  maxLevel: number;
  totalWrong: number;
  sessionsCount: number;
  createdAt: string;
  lastPlayed: string;
  activeRun?: ActiveRun;
}

export type SessionResult = "in_progress" | "victory" | "game_over" | "abandoned";

export interface SessionRecord {
  id: string;
  studentId: string;
  startedAt: string;
  endedAt: string | null;
  startLevel: number;
  maxLevel: number;
  result: SessionResult;
  lastActivity: string;
}

export interface StoredChoice {
  latex: string;
  isCorrect: boolean;
}

export interface AttemptRecord {
  id: string;
  sessionId: string;
  studentId: string;
  level: number;
  templateId: string;
  kind: "mc" | "short";
  params: Record<string, number | string>;
  questionText: string;
  choices: StoredChoice[] | null;
  givenAnswer: string;
  correctAnswer: string;
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
  maxLevel: number;
  wrongCount: number;
  lastPlayed: string | null;
  createdAt: string;
}

export interface LevelStat {
  level: number;
  attempts: number;
  wrong: number;
  wrongRate: number;
}

export interface TemplateStat {
  templateId: string;
  level: number;
  attempts: number;
  wrong: number;
  wrongRate: number;
}

export interface TeacherDashboard {
  students: TeacherStudentRow[];
  levelStats: LevelStat[];
  templateStats: TemplateStat[];
  generatedAt: string;
}

export interface TeacherStudentDetail {
  student: TeacherStudentRow;
  sessions: SessionRecord[];
  attempts: Array<AttemptRecord & { createdAt: string }>;
}
