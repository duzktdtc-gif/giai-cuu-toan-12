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
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RESULTS = new Set([
  "in_progress",
  "win",
  "lose_lives",
  "lose_timeout",
  "abandoned",
  // Giá trị của phiên bản 7 màn cũ.
  "victory",
  "game_over",
]);

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

function optionalIndex(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 3) return null;
  return number;
}

function indexFromAnswer(value: string): number | null {
  const match = value.trim().match(/^([A-D])(?:[.)\s]|$)/i);
  return match ? match[1].toUpperCase().charCodeAt(0) - 65 : null;
}

function uuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function dateIso(value: unknown, fallback: string | null = null): string | null {
  if (typeof value !== "string") return fallback;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString();
}

function optionText(value: unknown): string {
  if (typeof value === "string") return text(value, 1000);
  if (value && typeof value === "object") {
    const option = value as Record<string, unknown>;
    const candidate = option.text ?? option.label ?? option.value ?? option.html ?? "";
    if (typeof candidate === "string") return text(candidate, 1000);
  }
  return "";
}

function parseOptions(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const options = value
    .slice(0, 6)
    .map(optionText)
    .filter((option) => option.length > 0);
  return options.length ? options : null;
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
  student_id: string;
  started_at: string;
  ended_at: string | null;
  level: number;
  start_level: number;
  max_level: number;
  total_time_ms: number;
  wrong_count: number;
  correct_count: number;
  cleared_count: number;
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
    const level = integer(input.level ?? input.startLevel, 1, 7, 1);
    const startLevel = integer(input.startLevel ?? input.level, 1, 7, level);
    const maxLevel = Math.max(level, integer(input.maxLevel, 0, 7, level));
    const session: SessionInput = {
      id,
      student_id: studentId,
      started_at: startedAt,
      ended_at: endedAt,
      level,
      start_level: startLevel,
      max_level: maxLevel,
      total_time_ms: integer(input.totalTimeMs, 0, 86_400_000, 0),
      wrong_count: integer(input.wrongCount, 0, 1000, 0),
      correct_count: integer(input.correctCount, 0, 1000, 0),
      cleared_count: integer(input.clearedCount, 0, 5, 0),
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
  question_id: string;
  template_id: string;
  kind: "mc" | "short";
  params_json: Record<string, unknown>;
  question_text: string;
  choices_json: string[] | null;
  given_answer: string;
  correct_answer: string;
  is_correct: boolean;
  is_similar: boolean;
  chosen_index: number | null;
  correct_index: number | null;
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
    const questionId = text(input.questionId ?? input.templateId, 80);
    const questionText = typeof input.questionText === "string" ? input.questionText.slice(0, 4000) : "";
    if (!questionId || !questionText) continue;
    const createdAt = dateIso(input.createdAt, fallbackTime) ?? fallbackTime;
    const options = parseOptions(input.options ?? input.choices);
    const givenAnswer = text(input.chosenText ?? input.givenAnswer, 2000);
    const correctAnswer = text(input.correctText ?? input.correctAnswer, 2000);
    let chosenIndex = optionalIndex(input.chosenIndex) ?? indexFromAnswer(givenAnswer);
    let correctIndex = optionalIndex(input.correctIndex) ?? indexFromAnswer(correctAnswer);
    if (options) {
      if (chosenIndex === null) {
        const found = options.indexOf(givenAnswer);
        if (found >= 0) chosenIndex = found;
      }
      if (correctIndex === null) {
        const found = options.indexOf(correctAnswer);
        if (found >= 0) correctIndex = found;
      }
    }
    map.set(id, {
      id,
      session_id: sessionId,
      student_id: studentId,
      level: integer(input.level, 1, 7, 1),
      question_id: questionId,
      template_id: questionId,
      kind: input.kind === "short" ? "short" : "mc",
      params_json: {},
      question_text: questionText,
      choices_json: options,
      given_answer: givenAnswer,
      correct_answer: correctAnswer,
      is_correct: input.isCorrect === true,
      is_similar: input.isSimilar === true,
      chosen_index: chosenIndex,
      correct_index: correctIndex,
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
      level: attempt.level,
      start_level: attempt.level,
      max_level: attempt.level,
      total_time_ms: 0,
      wrong_count: 0,
      correct_count: 0,
      cleared_count: 0,
      result: "in_progress",
      last_activity: attempt.created_at,
    }));
  if (stubs.length) {
    const { error } = await db.from("sessions").upsert(stubs, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!supabaseUrl || !serviceKey) return json(req, { error: "Thiếu cấu hình Supabase" }, 500);

  try {
    const rawBody = await req.text();
    if (rawBody.length > 200_000) return json(req, { error: "Dữ liệu quá lớn" }, 413);
    const body = JSON.parse(rawBody) as Record<string, unknown>;
    const student = parseStudent(body.student);
    if (!student) return json(req, { error: "Thông tin học sinh không hợp lệ" }, 400);
    const studentId = await ensureStudent(student);
    const now = new Date().toISOString();

    if (body.action === "bootstrap") {
      return json(req, { studentId, maxLevel: await maxLevelOf(studentId) });
    }

    if (body.action !== "sync") return json(req, { error: "Action không hợp lệ" }, 400);

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

    return json(req, { studentId, synced: { sessions: sessions.length, attempts: attempts.length } });
  } catch (error) {
    console.error("game-sync error", error);
    return json(req, { error: "Không thể đồng bộ dữ liệu" }, 500);
  }
});
