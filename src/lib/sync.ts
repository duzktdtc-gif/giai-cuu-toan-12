import type { StudentIdentity, SyncQueueItem } from "./models";
import { loadQueue, saveQueue } from "./storage";
import { getSupabaseConfig } from "./appConfig";

const { url: supabaseUrl, anonKey } = getSupabaseConfig();

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
      // Cùng một session có thể xuất hiện nhiều lần (in_progress rồi kết thúc).
      // Chỉ gửi bản mới nhất để upsert không đụng khóa hai lần trong một câu lệnh.
      const sessions = new Map<string, Extract<SyncQueueItem, { kind: "session" }>["session"]>();
      for (const item of group.sessions) {
        if (item.kind !== "session") continue;
        const previous = sessions.get(item.session.id);
        if (!previous || item.session.lastActivity >= previous.lastActivity) {
          sessions.set(item.session.id, item.session);
        }
      }
      const attempts = new Map<string, Extract<SyncQueueItem, { kind: "attempt" }>["attempt"]>();
      for (const item of group.attempts) {
        if (item.kind !== "attempt") continue;
        attempts.set(item.attempt.id, item.attempt);
      }
      const sessionList = [...sessions.values()];
      const attemptList = [...attempts.values()];
      let sessionIndex = 0;
      let attemptIndex = 0;
      // Edge Function chỉ nhận tối đa 20 session và 60 attempt mỗi request.
      // Chia lô để không mất dữ liệu khi hàng đợi offline dài.
      while (sessionIndex < sessionList.length || attemptIndex < attemptList.length) {
        const sessionBatch = sessionList.slice(sessionIndex, sessionIndex + 20);
        const attemptBatch = attemptList.slice(attemptIndex, attemptIndex + 40);
        if (!sessionBatch.length && !attemptBatch.length) break;
        const body = {
          action: "sync",
          student: group.student,
          sessions: sessionBatch,
          attempts: attemptBatch,
        };
        await postJson(functionUrl("game-sync"), body);
        for (const session of sessionBatch) doneIds.add(`s:${session.id}`);
        for (const attempt of attemptBatch) doneIds.add(`a:${attempt.id}`);
        sessionIndex += sessionBatch.length;
        attemptIndex += attemptBatch.length;
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

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushSync();
  });
  window.setTimeout(() => {
    void flushSync();
  }, 3000);
}
