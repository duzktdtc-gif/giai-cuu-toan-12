import type { StudentIdentity, StudentProfile, SyncQueueItem } from "./models";
import { loadQueue, saveQueue } from "./storage";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const supabaseConfigured =
  Boolean(supabaseUrl && anonKey) &&
  !supabaseUrl.includes("YOUR-PROJECT") &&
  !anonKey.includes("YOUR-ANON");

function functionUrl(name: string): string {
  return `${supabaseUrl}/functions/v1/${name}`;
}

async function postJson<T>(url: string, body: unknown, token?: string, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${token || anonKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

let flushing = false;
let retryTimer: number | undefined;
let retryCount = 0;

function scheduleRetry(): void {
  if (typeof window === "undefined") return;
  retryCount = Math.min(retryCount + 1, 5);
  const delay = Math.min(5000 * 2 ** (retryCount - 1), 120000);
  if (retryTimer) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    void flushSync();
  }, delay);
}

/** Gửi hàng đợi lên Supabase; lỗi mạng thì giữ lại và thử lại, không chặn game. */
export async function flushSync(): Promise<boolean> {
  if (!supabaseConfigured || flushing) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    scheduleRetry();
    return false;
  }
  const queue = loadQueue();
  if (!queue.length) return true;

  flushing = true;
  try {
    const groups = new Map<string, { student: StudentIdentity; sessions: SyncQueueItem[]; attempts: SyncQueueItem[] }>();
    for (const item of queue) {
      const student = item.student;
      let group = groups.get(student.id);
      if (!group) {
        group = { student, sessions: [], attempts: [] };
        groups.set(student.id, group);
      }
      if (item.kind === "session") group.sessions.push(item);
      else group.attempts.push(item);
    }

    const doneIds = new Set<string>();
    for (const group of groups.values()) {
      const body = {
        action: "sync",
        student: group.student,
        sessions: group.sessions.map((item) => (item.kind === "session" ? item.session : null)).filter(Boolean),
        attempts: group.attempts.map((item) => (item.kind === "attempt" ? item.attempt : null)).filter(Boolean),
      };
      await postJson(functionUrl("game-sync"), body);
      for (const item of [...group.sessions, ...group.attempts]) {
        doneIds.add(item.kind === "session" ? `s:${item.session.id}` : `a:${item.attempt.id}`);
      }
    }

    const remaining = loadQueue().filter((item) =>
      item.kind === "session" ? !doneIds.has(`s:${item.session.id}`) : !doneIds.has(`a:${item.attempt.id}`),
    );
    saveQueue(remaining);
    retryCount = 0;
    return true;
  } catch {
    scheduleRetry();
    return false;
  } finally {
    flushing = false;
  }
}

export function requestSync(delayMs = 900): void {
  if (!supabaseConfigured || typeof window === "undefined") return;
  if (retryTimer) window.clearTimeout(retryTimer);
  retryTimer = window.setTimeout(() => {
    void flushSync();
  }, delayMs);
}

export async function bootstrapStudent(profile: StudentProfile): Promise<number | null> {
  if (!supabaseConfigured) return null;
  try {
    const result = await postJson<{ maxLevel?: number }>(functionUrl("game-sync"), {
      action: "bootstrap",
      student: {
        id: profile.id,
        name: profile.name,
        className: profile.className,
        avatar: profile.avatar,
      },
    });
    return typeof result.maxLevel === "number" ? result.maxLevel : null;
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushSync();
  });
  window.setTimeout(() => {
    void flushSync();
  }, 3000);
}
