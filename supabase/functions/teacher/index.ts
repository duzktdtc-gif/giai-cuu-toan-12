import { createClient } from "npm:@supabase/supabase-js@2";

const PRODUCTION_ORIGIN = "https://duzktdtc-gif.github.io";
const DEV_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origin === PRODUCTION_ORIGIN || DEV_ORIGIN_RE.test(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : PRODUCTION_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json; charset=utf-8" },
  });
}

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const teacherKey = Deno.env.get("TEACHER_KEY") ?? "";
const tokenSecret = Deno.env.get("TEACHER_TOKEN_SECRET") ?? teacherKey;
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function b64urlEncode(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function safeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

let hmacKeyPromise: Promise<CryptoKey> | null = null;
function hmacKey(): Promise<CryptoKey> {
  if (!hmacKeyPromise) {
    hmacKeyPromise = crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(tokenSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
  }
  return hmacKeyPromise;
}

async function signToken(): Promise<{ token: string; expiresAt: number }> {
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = b64urlEncode(JSON.stringify({ sub: "teacher", exp: expiresAt }));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(payload)));
  return { token: `${payload}.${b64urlEncode(signature)}`, expiresAt };
}

async function verifyToken(token: string | null): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  try {
    const expected = new Uint8Array(
      await crypto.subtle.sign("HMAC", await hmacKey(), new TextEncoder().encode(parts[0])),
    );
    const actual = b64urlDecode(parts[1]);
    if (expected.length !== actual.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i];
    if (diff !== 0) return false;
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0]))) as { exp?: number; sub?: string };
    return payload.sub === "teacher" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

function bearer(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

function mapStudent(row: Record<string, unknown>) {
  const levelsPlayed = Array.isArray(row.levels_played)
    ? row.levels_played
        .map((level) => Number(level))
        .filter((level) => Number.isInteger(level) && level > 0)
    : [];
  return {
    id: row.id,
    displayName: row.display_name,
    className: row.class,
    avatar: row.avatar,
    sessionsCount: Number(row.sessions_count ?? 0),
    winCount: Number(row.win_count ?? 0),
    loseLivesCount: Number(row.lose_lives_count ?? 0),
    loseTimeoutCount: Number(row.lose_timeout_count ?? 0),
    totalTimeMs: Number(row.total_time_ms ?? 0),
    wrongCount: Number(row.wrong_count ?? 0),
    correctCount: Number(row.correct_count ?? 0),
    lastLevel: Number(row.last_level ?? 0),
    levelsPlayed,
    maxLevel: Number(row.max_level ?? 0),
    lastPlayed: row.last_played ?? null,
    createdAt: row.created_at,
  };
}

function mapSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    studentId: row.student_id,
    level: Number(row.level ?? row.start_level ?? 1),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    startLevel: Number(row.start_level ?? 1),
    maxLevel: Number(row.max_level ?? 0),
    totalTimeMs: Number(row.total_time_ms ?? 0),
    wrongCount: Number(row.wrong_count ?? 0),
    correctCount: Number(row.correct_count ?? 0),
    clearedCount: Number(row.cleared_count ?? 0),
    result: row.result,
    lastActivity: row.last_activity,
  };
}

function mapOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const option = item as Record<string, unknown>;
        const candidate = option.text ?? option.label ?? option.value ?? "";
        return typeof candidate === "string" ? candidate : "";
      }
      return "";
    })
    .filter((item) => item.length > 0);
}

function mapAttempt(row: Record<string, unknown>) {
  return {
    id: row.id,
    sessionId: row.session_id,
    studentId: row.student_id,
    level: Number(row.level ?? 1),
    questionId: row.question_id ?? row.template_id,
    isSimilar: row.is_similar === true,
    questionText: row.question_text,
    options: mapOptions(row.choices_json),
    chosenIndex: row.chosen_index === null || row.chosen_index === undefined ? null : Number(row.chosen_index),
    correctIndex: row.correct_index === null || row.correct_index === undefined ? null : Number(row.correct_index),
    chosenText: row.given_answer,
    correctText: row.correct_answer,
    isCorrect: row.is_correct === true,
    livesLeft: Number(row.lives_left ?? 0),
    timeSpentMs: Number(row.time_spent_ms ?? 0),
    createdAt: row.created_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceKey) return json(req, { error: "Thiếu cấu hình Supabase" }, 500);
  if (!teacherKey) return json(req, { error: "Máy chủ chưa cấu hình TEACHER_KEY" }, 500);

  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "login") {
      const key = typeof body.key === "string" ? body.key.trim() : "";
      if (!key || !(await safeEqual(key, teacherKey))) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return json(req, { error: "Key giáo viên không đúng." }, 401);
      }
      return json(req, await signToken());
    }

    if (!(await verifyToken(bearer(req)))) {
      return json(req, { error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." }, 401);
    }

    if (body.action === "dashboard") {
      const [students, levels, questions] = await Promise.all([
        db.from("v_student_overview").select("*").order("last_played", { ascending: false }).limit(2000),
        db.from("v_level_stats").select("*"),
        db.from("v_question_stats").select("*"),
      ]);
      if (students.error) throw students.error;
      if (levels.error) throw levels.error;
      if (questions.error) throw questions.error;
      return json(req, {
        students: (students.data ?? []).map((row) => mapStudent(row as Record<string, unknown>)),
        levelStats: (levels.data ?? []).map((row) => ({
          level: Number(row.level),
          attempts: Number(row.attempts),
          wrong: Number(row.wrong),
          wrongRate: Number(row.wrong_rate ?? 0),
          sessions: Number(row.sessions ?? 0),
          wins: Number(row.wins ?? 0),
          avgTimeMs: Number(row.avg_time_ms ?? 0),
        })),
        questionStats: (questions.data ?? []).map((row) => ({
          questionId: row.question_id,
          level: Number(row.level),
          attempts: Number(row.attempts),
          wrong: Number(row.wrong),
          wrongRate: Number(row.wrong_rate ?? 0),
          similarAttempts: Number(row.similar_attempts ?? 0),
        })),
        generatedAt: new Date().toISOString(),
        answerReviewRequired: true,
      });
    }

    if (body.action === "student-detail") {
      const studentId = typeof body.studentId === "string" ? body.studentId : "";
      if (!/^[0-9a-f-]{36}$/i.test(studentId)) return json(req, { error: "studentId không hợp lệ" }, 400);
      const student = await db.from("v_student_overview").select("*").eq("id", studentId).maybeSingle();
      if (student.error) throw student.error;
      if (!student.data) return json(req, { error: "Không tìm thấy học sinh" }, 404);
      const [sessions, attempts] = await Promise.all([
        db.from("sessions").select("*").eq("student_id", studentId).order("started_at", { ascending: false }).limit(200),
        db.from("attempts").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (sessions.error) throw sessions.error;
      if (attempts.error) throw attempts.error;
      return json(req, {
        student: mapStudent(student.data as Record<string, unknown>),
        sessions: (sessions.data ?? []).map((row) => mapSession(row as Record<string, unknown>)),
        attempts: (attempts.data ?? []).map((row) => mapAttempt(row as Record<string, unknown>)),
      });
    }

    return json(req, { error: "Action không hợp lệ" }, 400);
  } catch (error) {
    console.error("teacher error", error);
    return json(req, { error: "Máy chủ gặp lỗi. Vui lòng thử lại." }, 500);
  }
});
