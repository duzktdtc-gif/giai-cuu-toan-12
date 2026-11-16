import type { QuestionTemplate } from "./types";
import { level1Templates } from "./level1";
import { level2Templates } from "./level2";
import { level3Templates } from "./level3";
import { level4Templates } from "./level4";
import { level5Templates } from "./level5";
import { level6Templates } from "./level6";
import { level7Templates } from "./level7";

export const TEMPLATES_BY_LEVEL: QuestionTemplate[][] = [
  level1Templates,
  level2Templates,
  level3Templates,
  level4Templates,
  level5Templates,
  level6Templates,
  level7Templates,
];

export const ALL_TEMPLATES: QuestionTemplate[] = TEMPLATES_BY_LEVEL.flat();

export function templatesForLevel(level: number): QuestionTemplate[] {
  return TEMPLATES_BY_LEVEL[Math.min(Math.max(level, 1), 7) - 1];
}

export function templateById(id: string): QuestionTemplate | undefined {
  return ALL_TEMPLATES.find((template) => template.id === id);
}

export function templateTitle(id: string): string {
  return templateById(id)?.title ?? id;
}

const ids = new Set(ALL_TEMPLATES.map((template) => template.id));
if (ids.size !== ALL_TEMPLATES.length) {
  throw new Error("Có templateId bị trùng trong ngân hàng câu hỏi");
}

export { level1Templates, level2Templates, level3Templates, level4Templates, level5Templates, level6Templates, level7Templates };
