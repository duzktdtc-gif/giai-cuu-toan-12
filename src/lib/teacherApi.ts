import type { TeacherDashboard, TeacherStudentDetail } from "./models";
import { supabaseConfigured } from "./sync";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export interface TeacherSession {
  token: string;
  expiresAt: number;
}

export class TeacherApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function callTeacher<T>(body: unknown, token?: string, timeoutMs = 12000): Promise<T> {
  if (!supabaseConfigured) {
    throw new TeacherApiError("Chưa cấu hình Supabase cho khu vực giáo viên.", 0);
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/teacher`, {
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
      let message = "Không thể kết nối máy chủ.";
      try {
        const data = (await response.json()) as { error?: string };
        if (data?.error) message = data.error;
      } catch {
        /* body không phải JSON */
      }
      if (response.status === 401) message = "Phiên đăng nhập hết hạn hoặc key không đúng.";
      throw new TeacherApiError(message, response.status);
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TeacherApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new TeacherApiError("Máy chủ phản hồi quá chậm. Vui lòng thử lại.", 0);
    }
    throw new TeacherApiError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", 0);
  } finally {
    clearTimeout(timeout);
  }
}

const TOKEN_KEY = "gcs:teacher-token";

export function loadTeacherSession(): TeacherSession | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeacherSession;
    if (!parsed.token || parsed.expiresAt < Date.now()) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveTeacherSession(session: TeacherSession): void {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch {
    /* bỏ qua */
  }
}

export function clearTeacherSession(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* bỏ qua */
  }
}

export async function teacherLogin(key: string): Promise<TeacherSession> {
  const result = await callTeacher<{ token: string; expiresAt: number }>({ action: "login", key });
  const session = { token: result.token, expiresAt: result.expiresAt };
  saveTeacherSession(session);
  return session;
}

export async function fetchDashboard(token: string): Promise<TeacherDashboard> {
  return callTeacher<TeacherDashboard>({ action: "dashboard" }, token);
}

export async function fetchStudentDetail(token: string, studentId: string): Promise<TeacherStudentDetail> {
  return callTeacher<TeacherStudentDetail>({ action: "student-detail", studentId }, token);
}
