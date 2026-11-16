import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULTS = new Set(["in_progress", "victory", "game_over", "abandoned"]);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.normalize("NFC").trim().replace(/\s+/g, " ").slice(0, max) : "";
}

function normalizeName(value: unknown): string {
  return text(value, 80).toLocaleLowerCase("vi");
}

function normalizeClass(value: unknown): string {
  return text(value, 30).replace(/\s+/g, "").toLocaleUpperCase("vi");
}

function integer(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function dateIso(value: unknown, fallback: string | null = null): string | null {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

interface StudentInput {
  id: string;
  name: string;
  nameNormalized: string;
  className: string;
  classNormalized: string;
  avatar: "prince" | "princess";
}

function parseStudent(raw: unknown): StudentInput | null {
  if (!raw || typeof raw !== "object") return null;
  const input = raw as Record<string, unknown>;
  const name = text(input.name, 80);
  const className = text(input.className, 30);
  const avatar = input.avatar === "princess" ? "princess" : input.avatar === "prince" ? "prince" : null;
  const nameNormalized = normalizeName(name);
  const classNormalized = normalizeClass(className);
  if (name.length < 2 || !className || !avatar) return null;
  if (!nameNormalized || !classNormalized) return null;
  return {
    id: uuid(input.id) ?? crypto.randomUUID(),
    name,
    nameNormalized,
    className,
    classNormalized,
    avatar,
  };
}

async function ensureStudent(student: StudentInput): Promise<string> {
  const { data: existing, error: selectError } = await db
    .from("students")
    .select("id")
    .eq("name_normalized", student.nameNormalized)
    .eq("class_normalized", student.classNormalized)
    .maybeSingle();
  if (selectError) throw selectError;
  if (existing?.id) {
    await db
      .from("students")
      .update({ display_name: student.name, class: student.className, avatar: student.avatar })
      .eq("id", existing.id);
    return existing.id as string;
  }

  const { data, error } = await db
    .from("students")
    .insert({
      id: student.id,
      name_normalized: student.nameNormalized,
      display_name: student.name,
      class: student.className,
      class_normalized: student.classNormalized,
      avatar: student.avatar,
    })
    .select("id")
    .maybeSingle();

  if (!error && data?.id) return data.id as string;

  if (error && (error as { code?: string }).code === "23505") {
    const { data: retry } = await db
      .from("students")
      .select("id")
      .eq("name_normalized", student.nameNormalized)
      .eq("class_normalized", student.classNormalized)
      .maybeSingle();
    if (retry?.id) return retry.id as string;
  }
  throw error ?? new Error("Không tạo được học sinh");
}

async function maxLevelOf(studentId: string): Promise<number> {
  const { data, error } = await db
    .from("sessions")
    .select("max_level")
    .eq("student_id", studentId)
    .order("max_level", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Number(data?.max_level ?? 0);
}

interface SessionInput {
  id: string;
  started_at: string;
  ended_at: string | null;
  start_level: number;
  max_level: number;
  result: string;
  last_activity: string;
}

function parseSessions(raw: unknown, studentId: string, fallbackTime: string): SessionInput[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, SessionInput>();
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== "object") continue;
    const input = item as Record<string, unknown>;
    const id = uuid(input.id);
    if (!id) continue;
    const startedAt = dateIso(input.startedAt, fallbackTime) ?? fallbackTime;
    const endedAt = dateIso(input.endedAt, null);
    const result = typeof input.result === "string" && RESULTS.has(input.result) ? input.result : "in_progress";
    const session: SessionInput & { student_id?: string } = {
      id,
      student_id: studentId,
      started_at: startedAt,
      ended_at: endedAt,
      start_level: integer(input.startLevel, 1, 7, 1),
      max_level: integer(input.maxLevel, 0, 7, 0),
      result,
      last_activity: dateIso(input.lastActivity, endedAt ?? startedAt) ?? startedAt,
    };
    map.set(id, session);
  }
  return [...map.values()];
}

interface AttemptInput {
  id: string;
  session_id: string;
  student_id: string;
  level: number;
  template_id: string;
  kind: "mc" | "short";
  params_json: Record<string, unknown>;
  question_text: string;
  choices_json: unknown[] | null;
  given_answer: string;
  correct_answer: string;
  is_correct: boolean;
  lives_left: number;
  time_spent_ms: number;
  created_at: string;
}

function parseAttempts(raw: unknown, studentId: string, fallbackTime: string): AttemptInput[] {
  if (!Array.isArray(raw)) return [];
  const map = new Map<string, AttemptInput>();
  for (const item of raw.slice(0, 60)) {
    if (!item || typeof item !== "object") continue;
    const input = item as Record<string, unknown>;
    const id = uuid(input.id);
    const sessionId = uuid(input.sessionId);
    if (!id || !sessionId) continue;
    const templateId = text(input.templateId, 80);
    const questionText = typeof input.questionText === "string" ? input.questionText.slice(0, 4000) : "";
    if (!templateId || !questionText) continue;
    const createdAt = dateIso(input.createdAt, fallbackTime) ?? fallbackTime;
    const params =
      input.params && typeof input.params === "object" && !Array.isArray(input.params)
        ? (input.params as Record<string, unknown>)
        : {};
    const choices = Array.isArray(input.choices) && input.choices.length <= 6 ? input.choices : null;
    map.set(id, {
      id,
      session_id: sessionId,
      student_id: studentId,
      level: integer(input.level, 1, 7, 1),
      template_id: templateId,
      kind: input.kind === "short" ? "short" : "mc",
      params_json: params,
      question_text: questionText,
      choices_json: choices,
      given_answer: typeof input.givenAnswer === "string" ? input.givenAnswer.slice(0, 2000) : "",
      correct_answer: typeof input.correctAnswer === "string" ? input.correctAnswer.slice(0, 2000) : "",
      is_correct: input.isCorrect === true,
      lives_left: integer(input.livesLeft, 0, 3, 0),
      time_spent_ms: integer(input.timeSpentMs, 0, 86_400_000, 0),
      created_at: createdAt,
    });
  }
  return [...map.values()];
}

async function ensureSessions(attempts: AttemptInput[], sessionIds: Set<string>, studentId: string): Promise<void> {
  if (!attempts.length) return;
  const needed = new Set(attempts.map((attempt) => attempt.session_id));
  const existing = new Set([...sessionIds]);
  if (needed.size) {
    const { data, error } = await db.from("sessions").select("id").in("id", [...needed]);
    if (error) throw error;
    for (const row of data ?? []) existing.add(row.id as string);
  }
  const stubs = attempts
    .filter((attempt) => !existing.has(attempt.session_id))
    .map((attempt) => ({
      id: attempt.session_id,
      student_id: studentId,
      started_at: attempt.created_at,
      ended_at: null,
      start_level: attempt.level,
      max_level: Math.max(0, attempt.level - 1),
      result: "in_progress",
      last_activity: attempt.created_at,
    }));
  if (stubs.length) {
    const { error } = await db.from("sessions").upsert(stubs, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceKey) return json({ error: "Thiếu cấu hình Supabase" }, 500);

  try {
    const rawBody = await req.text();
    if (rawBody.length > 200_000) return json({ error: "Dữ liệu quá lớn" }, 413);
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const student = parseStudent(body.student);
    if (!student) return json({ error: "Thông tin học sinh không hợp lệ" }, 400);
    const studentId = await ensureStudent(student);
    const now = new Date().toISOString();

    if (body.action === "bootstrap") {
      return json({ studentId, maxLevel: await maxLevelOf(studentId) });
    }

    if (body.action !== "sync") return json({ error: "Action không hợp lệ" }, 400);

    const sessions = parseSessions(body.sessions, studentId, now);
    const attempts = parseAttempts(body.attempts, studentId, now);
    const sessionIds = new Set(sessions.map((session) => session.id));

    if (sessions.length) {
      const { error } = await db.from("sessions").upsert(sessions, { onConflict: "id" });
      if (error) throw error;
    }
    await ensureSessions(attempts, sessionIds, studentId);
    if (attempts.length) {
      const { error } = await db.from("attempts").upsert(attempts, { onConflict: "id" });
      if (error) throw error;
    }

    return json({ studentId, synced: { sessions: sessions.length, attempts: attempts.length } });
  } catch (error) {
    console.error("game-sync error", error);
    return json({ error: "Không thể đồng bộ dữ liệu" }, 500);
  }
});
