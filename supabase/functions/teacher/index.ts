import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const teacherKey = Deno.env.get("TEACHER_KEY") ?? "";
const tokenSecret = Deno.env.get("TEACHER_TOKEN_SECRET") ?? teacherKey;
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

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
  return {
    id: row.id,
    displayName: row.display_name,
    className: row.class,
    avatar: row.avatar,
    sessionsCount: Number(row.sessions_count ?? 0),
    maxLevel: Number(row.max_level ?? 0),
    wrongCount: Number(row.wrong_count ?? 0),
    lastPlayed: row.last_played ?? null,
    createdAt: row.created_at,
  };
}

function mapSession(row: Record<string, unknown>) {
  return {
    id: row.id,
    studentId: row.student_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    startLevel: Number(row.start_level ?? 1),
    maxLevel: Number(row.max_level ?? 0),
    result: row.result,
    lastActivity: row.last_activity,
  };
}

function mapAttempt(row: Record<string, unknown>) {
  return {
    id: row.id,
    sessionId: row.session_id,
    studentId: row.student_id,
    level: Number(row.level ?? 1),
    templateId: row.template_id,
    kind: row.kind,
    params: row.params_json ?? {},
    questionText: row.question_text,
    choices: row.choices_json ?? null,
    givenAnswer: row.given_answer,
    correctAnswer: row.correct_answer,
    isCorrect: row.is_correct === true,
    livesLeft: Number(row.lives_left ?? 0),
    timeSpentMs: Number(row.time_spent_ms ?? 0),
    createdAt: row.created_at,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceKey) return json({ error: "Thiếu cấu hình Supabase" }, 500);
  if (!teacherKey) return json({ error: "Máy chủ chưa cấu hình TEACHER_KEY" }, 500);

  try {
    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "login") {
      const key = typeof body.key === "string" ? body.key.trim() : "";
      if (!key || !(await safeEqual(key, teacherKey))) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return json({ error: "Key giáo viên không đúng." }, 401);
      }
      return json(await signToken());
    }

    if (!(await verifyToken(bearer(req)))) {
      return json({ error: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn." }, 401);
    }

    if (body.action === "dashboard") {
      const [students, levels, templates] = await Promise.all([
        db.from("v_student_overview").select("*").order("last_played", { ascending: false }).limit(2000),
        db.from("v_level_stats").select("*"),
        db.from("v_template_stats").select("*"),
      ]);
      if (students.error) throw students.error;
      if (levels.error) throw levels.error;
      if (templates.error) throw templates.error;
      return json({
        students: (students.data ?? []).map((row) => mapStudent(row as Record<string, unknown>)),
        levelStats: (levels.data ?? []).map((row) => ({
          level: Number(row.level),
          attempts: Number(row.attempts),
          wrong: Number(row.wrong),
          wrongRate: Number(row.wrong_rate ?? 0),
        })),
        templateStats: (templates.data ?? []).map((row) => ({
          templateId: row.template_id,
          level: Number(row.level),
          attempts: Number(row.attempts),
          wrong: Number(row.wrong),
          wrongRate: Number(row.wrong_rate ?? 0),
        })),
        generatedAt: new Date().toISOString(),
      });
    }

    if (body.action === "student-detail") {
      const studentId = typeof body.studentId === "string" ? body.studentId : "";
      if (!/^[0-9a-f-]{36}$/i.test(studentId)) return json({ error: "studentId không hợp lệ" }, 400);
      const student = await db.from("v_student_overview").select("*").eq("id", studentId).maybeSingle();
      if (student.error) throw student.error;
      if (!student.data) return json({ error: "Không tìm thấy học sinh" }, 404);
      const [sessions, attempts] = await Promise.all([
        db.from("sessions").select("*").eq("student_id", studentId).order("started_at", { ascending: false }).limit(200),
        db.from("attempts").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(1000),
      ]);
      if (sessions.error) throw sessions.error;
      if (attempts.error) throw attempts.error;
      return json({
        student: mapStudent(student.data as Record<string, unknown>),
        sessions: (sessions.data ?? []).map((row) => mapSession(row as Record<string, unknown>)),
        attempts: (attempts.data ?? []).map((row) => mapAttempt(row as Record<string, unknown>)),
      });
    }

    return json({ error: "Action không hợp lệ" }, 400);
  } catch (error) {
    console.error("teacher error", error);
    return json({ error: "Máy chủ gặp lỗi. Vui lòng thử lại." }, 500);
  }
});
