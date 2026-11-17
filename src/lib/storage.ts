import type { StudentProfile, SyncQueueItem } from "./models";

const PROFILES_KEY = "gcs:v1:profiles";
const QUEUE_KEY = "gcs:v1:queue";
const LAST_KEY = "gcs:v1:last-student";
const SETTINGS_KEY = "gcs:v1:settings";

const memory = new Map<string, string>();

function safeGet(key: string): string | null {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch {
    /* trình duyệt chặn localStorage */
  }
  return memory.get(key) ?? null;
}

function safeSet(key: string, value: string): void {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* bỏ qua: chế độ riêng tư hoặc hết dung lượng */
  }
}

function parse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadProfiles(): StudentProfile[] {
  const profiles = parse<StudentProfile[]>(safeGet(PROFILES_KEY), []);
  if (!Array.isArray(profiles)) return [];
  const epoch = new Date(0).toISOString();
  return profiles
    .filter((profile) => profile && typeof profile.id === "string" && typeof profile.name === "string")
    .map((profile) => ({
      ...profile,
      sessionsCount: Number(profile.sessionsCount) || 0,
      runsByLevel: profile.runsByLevel ?? {},
      winsByLevel: profile.winsByLevel ?? {},
      createdAt: typeof profile.createdAt === "string" ? profile.createdAt : epoch,
      lastPlayed:
        typeof profile.lastPlayed === "string"
          ? profile.lastPlayed
          : typeof profile.createdAt === "string"
            ? profile.createdAt
            : epoch,
    }));
}

export function saveProfiles(profiles: StudentProfile[]): void {
  safeSet(PROFILES_KEY, JSON.stringify(profiles.slice(-200)));
}

export function loadProfile(id: string): StudentProfile | undefined {
  return loadProfiles().find((profile) => profile.id === id);
}

export function saveProfile(profile: StudentProfile): void {
  const profiles = loadProfiles();
  const index = profiles.findIndex((item) => item.id === profile.id);
  if (index >= 0) profiles.splice(index, 1);
  profiles.push(profile);
  saveProfiles(profiles);
}

export function recentProfiles(limit = 3): StudentProfile[] {
  return loadProfiles()
    .slice()
    .sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed))
    .slice(0, limit);
}

export function setLastStudent(id: string): void {
  safeSet(LAST_KEY, id);
}

export function getLastStudent(): string | null {
  return safeGet(LAST_KEY);
}

export function loadQueue(): SyncQueueItem[] {
  const queue = parse<SyncQueueItem[]>(safeGet(QUEUE_KEY), []);
  return Array.isArray(queue) ? queue : [];
}

export function saveQueue(queue: SyncQueueItem[]): void {
  // Giữ tối đa 1500 sự kiện, ưu tiên bỏ attempt cũ trước để không mất session.
  let trimmed = queue;
  if (trimmed.length > 1500) {
    const attempts = trimmed.filter((item) => item.kind === "attempt");
    const sessions = trimmed.filter((item) => item.kind === "session");
    const keepAttempts = attempts.slice(attempts.length - 1200);
    trimmed = [...sessions, ...keepAttempts].sort((a, b) => {
      const ta = a.kind === "attempt" ? a.attempt.createdAt : a.session.startedAt;
      const tb = b.kind === "attempt" ? b.attempt.createdAt : b.session.startedAt;
      return ta.localeCompare(tb);
    });
  }
  safeSet(QUEUE_KEY, JSON.stringify(trimmed));
}

export function enqueue(items: SyncQueueItem[]): void {
  if (!items.length) return;
  const queue = loadQueue();
  queue.push(...items);
  saveQueue(queue);
}

export interface Settings {
  muted: boolean;
}

export function loadSettings(): Settings {
  return parse<Settings>(safeGet(SETTINGS_KEY), { muted: false });
}

export function saveSettings(settings: Settings): void {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}
