import type { GeneratedMCQuestion, GeneratedQuestion, QuestionTemplate } from "./types";

export interface MCArgs {
  template: Pick<QuestionTemplate, "id" | "level" | "topic" | "title">;
  prompt: string;
  correctLatex: string;
  distractors: string[];
  solution: string[];
  params: Record<string, number | string>;
}

/** Tạo câu trắc nghiệm, loại đáp án nhiễu trùng đáp án đúng/trùng nhau. */
export function makeMC(args: MCArgs): GeneratedMCQuestion {
  const seen = new Set<string>([normalize(args.correctLatex)]);
  const distractors: string[] = [];
  for (const candidate of args.distractors) {
    const key = normalize(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate);
  }
  if (distractors.length < 3) {
    throw new Error(`Mẫu ${args.template.id}: không đủ 3 đáp án nhiễu phân biệt`);
  }
  return {
    kind: "mc",
    templateId: args.template.id,
    level: args.template.level,
    topic: args.template.topic,
    title: args.template.title,
    prompt: args.prompt,
    answerLatex: args.correctLatex,
    correctLatex: args.correctLatex,
    distractors: distractors.slice(0, 3),
    solution: args.solution,
    params: args.params,
  };
}

function normalize(latex: string): string {
  return latex.replace(/\s+/g, "");
}

export function defineTemplate(
  meta: Pick<QuestionTemplate, "id" | "level" | "topic" | "title">,
  generate: QuestionTemplate["generate"],
): QuestionTemplate {
  return { ...meta, generate };
}

/** Đảm bảo câu trắc nghiệm có đủ 4 lựa chọn, nếu không thì báo lỗi rõ ràng. */
export function assertMC(question: GeneratedQuestion): GeneratedMCQuestion {
  if (question.kind !== "mc") throw new Error(`${question.templateId}: cần câu trắc nghiệm`);
  if (question.distractors.length !== 3) throw new Error(`${question.templateId}: thiếu đáp án nhiễu`);
  return question;
}
