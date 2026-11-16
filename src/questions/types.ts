import type { RNG } from "./rng";
import { shuffle } from "./rng";

export type QuestionKind = "mc" | "short";

export interface BaseGeneratedQuestion {
  templateId: string;
  level: number;
  topic: string;
  title: string;
  kind: QuestionKind;
  /** Đề bài dạng text trộn LaTeX trong cặp $...$ */
  prompt: string;
  /** Đáp án đúng dạng LaTeX (để hiển thị và lưu DB) */
  answerLatex: string;
  /** Lời giải từng bước, mỗi phần tử là text trộn LaTeX trong $...$ */
  solution: string[];
  /** Tham số đã random, lưu để giáo viên đối chiếu */
  params: Record<string, number | string>;
}

export interface GeneratedMCQuestion extends BaseGeneratedQuestion {
  kind: "mc";
  correctLatex: string;
  /** 3 đáp án nhiễu, chưa xáo trộn */
  distractors: string[];
}

export interface GeneratedShortQuestion extends BaseGeneratedQuestion {
  kind: "short";
  answerValue: number;
  /** Sai số tuyệt đối chấp nhận khi nhập số, mặc định 0.01 */
  tolerance?: number;
}

export type GeneratedQuestion = GeneratedMCQuestion | GeneratedShortQuestion;

export interface QuestionTemplate {
  id: string;
  level: number;
  topic: string;
  title: string;
  generate: (rng?: RNG) => GeneratedQuestion;
}

export interface PlayableChoice {
  latex: string;
  isCorrect: boolean;
}

export type PlayableQuestion = GeneratedQuestion & {
  /** Chỉ có với câu trắc nghiệm, đã xáo trộn */
  choices?: PlayableChoice[];
  answerIndex?: number;
};

/** Xáo trộn đáp án trắc nghiệm để vị trí đúng không cố định. */
export function prepareQuestion(question: GeneratedQuestion, rng: RNG = Math.random): PlayableQuestion {
  if (question.kind !== "mc") return { ...question };
  const tagged: PlayableChoice[] = [
    { latex: question.correctLatex, isCorrect: true },
    ...question.distractors.map((latex) => ({ latex, isCorrect: false })),
  ];
  const choices = shuffle(rng, tagged);
  return {
    ...question,
    choices,
    answerIndex: choices.findIndex((choice) => choice.isCorrect),
  };
}

/** Sinh lại cùng mẫu nhưng khác đề (dùng sau khi trả lời sai). */
export function generateSimilar(
  template: QuestionTemplate,
  previousPrompt: string,
  rng: RNG = Math.random,
  tries = 60,
): PlayableQuestion {
  let candidate = prepareQuestion(template.generate(rng), rng);
  for (let i = 0; i < tries && candidate.prompt === previousPrompt; i++) {
    candidate = prepareQuestion(template.generate(rng), rng);
  }
  return candidate;
}

/** Kiểm tra cấu trúc câu hỏi; dùng trong test và khi phát triển mẫu mới. */
export function validateQuestion(question: PlayableQuestion): string[] {
  const errors: string[] = [];
  if (!question.prompt.trim()) errors.push("Đề bài rỗng");
  if (!question.solution.length) errors.push("Thiếu lời giải");
  if (!question.answerLatex.trim()) errors.push("Thiếu đáp án hiển thị");
  if (question.kind === "mc") {
    if (!question.choices || question.choices.length !== 4) {
      errors.push(`Cần đúng 4 lựa chọn, hiện có ${question.choices?.length ?? 0}`);
      return errors;
    }
    const latexes = question.choices.map((choice) => choice.latex.replace(/\s+/g, ""));
    if (new Set(latexes).size !== latexes.length) errors.push("Có hai lựa chọn trùng nhau");
    const correct = question.choices.filter((choice) => choice.isCorrect);
    if (correct.length !== 1) errors.push("Phải có đúng 1 lựa chọn đúng");
    if (question.answerIndex === undefined || !question.choices[question.answerIndex]?.isCorrect) {
      errors.push("answerIndex không trỏ tới lựa chọn đúng");
    }
  } else {
    if (!Number.isFinite(question.answerValue)) errors.push("Đáp án số không hợp lệ");
    if (question.choices !== undefined) errors.push("Câu trả lời ngắn không được có lựa chọn");
  }
  return errors;
}

/** Chuẩn hoá cách nhập số: chấp nhận 1,5 ; 1.5 ; 3/2 ; -2,25 */
export function parseNumericAnswer(raw: string): number | null {
  const cleaned = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");
  if (!cleaned) return null;
  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }
  if (!/^-?\d+(?:\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function checkShortAnswer(question: GeneratedShortQuestion, raw: string): boolean {
  const value = parseNumericAnswer(raw);
  if (value === null) return false;
  const tolerance = question.tolerance ?? 0.01;
  return Math.abs(value - question.answerValue) <= tolerance;
}
