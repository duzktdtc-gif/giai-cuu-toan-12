import type { BankQuestion, FigureSpec } from "./types";
import { appVersion } from "../lib/appConfig";

const CACHE_PREFIX = "gcs:v2:bank:";
const memory = new Map<number, BankQuestion[]>();

function isFigure(value: unknown): value is FigureSpec {
  if (!value || typeof value !== "object") return false;
  const figure = value as Record<string, unknown>;
  if (figure.type === "cube") {
    return figure.highlight === undefined || (Array.isArray(figure.highlight) && figure.highlight.every((item) => typeof item === "string"));
  }
  if (figure.type === "lines") {
    return ["angle", "parallel", "coincident", "perpendicular", "skew", "three"].includes(String(figure.mode));
  }
  return false;
}

function isQuestion(value: unknown, level: 1 | 2): value is BankQuestion {
  if (!value || typeof value !== "object") return false;
  const question = value as Record<string, unknown>;
  return (
    typeof question.id === "string" &&
    question.id.length > 0 &&
    Number(question.level) === level &&
    typeof question.topic === "string" &&
    typeof question.stem === "string" &&
    question.stem.length > 0 &&
    Array.isArray(question.options) &&
    question.options.length === 4 &&
    question.options.every((option) => typeof option === "string" && option.trim().length > 0) &&
    Number.isInteger(question.correct) &&
    Number(question.correct) >= 0 &&
    Number(question.correct) <= 3 &&
    Array.isArray(question.solution) &&
    question.solution.every((step) => typeof step === "string") &&
    typeof question.isSimilar === "boolean" &&
    (question.figure == null || isFigure(question.figure)) &&
    (question.answerStatus === "reviewed" || question.answerStatus === "draft" || question.answerStatus === "missing") &&
    (question.solutionStatus === "reviewed" || question.solutionStatus === "draft" || question.solutionStatus === "missing")
  );
}

/** Kiểm tra cấu trúc ngân hàng câu hỏi; ném lỗi tiếng Việt nếu hỏng. */
export function validateBank(raw: unknown, level: 1 | 2): BankQuestion[] {
  if (!Array.isArray(raw)) throw new Error(`Dữ liệu màn ${level} không phải danh sách câu hỏi.`);
  const questions = raw.filter((item) => isQuestion(item, level));
  if (questions.length !== raw.length) {
    throw new Error(`Dữ liệu màn ${level} có câu thiếu trường bắt buộc hoặc sai định dạng.`);
  }
  const ids = new Set<string>();
  for (const question of questions) {
    if (ids.has(question.id)) throw new Error(`Mã câu bị trùng trong màn ${level}: ${question.id}`);
    ids.add(question.id);
  }
  const originals = questions.filter((question) => !question.isSimilar);
  if (originals.length < 5) {
    throw new Error(`Màn ${level} cần ít nhất 5 câu gốc, hiện có ${originals.length}.`);
  }
  for (const question of questions) {
    if (question.similarId && !ids.has(question.similarId)) {
      throw new Error(`Câu ${question.id} trỏ tới câu tương tự không tồn tại: ${question.similarId}`);
    }
    if (question.similarId) {
      const target = questions.find((item) => item.id === question.similarId);
      if (!target || !target.isSimilar || target.level !== question.level) {
        throw new Error(`Câu ${question.id} có similarId không phải câu tương tự cùng màn.`);
      }
    }
  }
  return questions;
}

function readCache(level: 1 | 2): BankQuestion[] | null {
  try {
    const raw = window.localStorage.getItem(`${CACHE_PREFIX}${level}`);
    if (!raw) return null;
    return validateBank(JSON.parse(raw), level);
  } catch {
    return null;
  }
}

function writeCache(level: 1 | 2, questions: BankQuestion[]): void {
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${level}`, JSON.stringify(questions));
  } catch {
    /* chế độ riêng tư hoặc hết dung lượng */
  }
}

export async function loadBank(level: 1 | 2): Promise<BankQuestion[]> {
  const cached = memory.get(level);
  if (cached) return cached;

  const version = appVersion();
  const url = new URL(`data/level${level}.json`, document.baseURI);
  url.searchParams.set("v", version === "dev" ? String(Date.now()) : version);

  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const questions = validateBank(await response.json(), level);
    memory.set(level, questions);
    writeCache(level, questions);
    return questions;
  } catch (error) {
    const fallback = readCache(level);
    if (fallback) {
      memory.set(level, fallback);
      return fallback;
    }
    throw new Error(
      `Không tải được dữ liệu màn ${level}. Kiểm tra kết nối mạng rồi thử lại. ${
        error instanceof Error ? `(${error.message})` : ""
      }`.trim(),
    );
  }
}
