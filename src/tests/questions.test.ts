import { describe, expect, it } from "vitest";
import { ALL_TEMPLATES } from "../questions";
import { generateSimilar, prepareQuestion, validateQuestion, parseNumericAnswer, checkShortAnswer } from "../questions/types";
import type { RNG } from "../questions/rng";

function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe("ngân hàng câu hỏi", () => {
  it("có ít nhất 3 mẫu bài mỗi màn và id không trùng", () => {
    const byLevel = new Map<number, number>();
    for (const template of ALL_TEMPLATES) {
      byLevel.set(template.level, (byLevel.get(template.level) ?? 0) + 1);
      expect(template.id).toMatch(/^l[1-7]-/);
    }
    for (let level = 1; level <= 7; level++) {
      expect(byLevel.get(level) ?? 0).toBeGreaterThanOrEqual(3);
    }
  });

  for (const template of ALL_TEMPLATES) {
    describe(`${template.id} – ${template.title}`, () => {
      it("sinh 200 câu hợp lệ, đáp án đúng nằm trong lựa chọn và không trùng nhau", () => {
        const rng = mulberry32(0x1234567 + template.level * 100 + template.id.length);
        const prompts = new Set<string>();
        for (let i = 0; i < 200; i++) {
          const question = prepareQuestion(template.generate(rng), rng);
          const errors = validateQuestion(question);
          if (errors.length) {
            throw new Error(`${template.id} lần ${i}: ${errors.join("; ")}\nPrompt: ${question.prompt}`);
          }
          prompts.add(question.prompt);
          expect(question.prompt.length).toBeGreaterThan(10);
          expect(question.solution.length).toBeGreaterThanOrEqual(2);
          expect(question.level).toBe(template.level);
          expect(question.templateId).toBe(template.id);

          if (question.kind === "mc") {
            const correct = question.choices!.filter((choice) => choice.isCorrect);
            expect(correct).toHaveLength(1);
            expect(question.choices![question.answerIndex!].latex).toBe(correct[0].latex);
            expect(correct[0].latex.replace(/\s+/g, "")).toBe(question.answerLatex.replace(/\s+/g, ""));
          } else {
            expect(Number.isFinite(question.answerValue)).toBe(true);
            expect(question.answerLatex.length).toBeGreaterThan(0);
          }
        }
        expect(prompts.size).toBeGreaterThan(3);
      });

      it("sinh lại sau khi sai luôn ra đề khác số liệu", () => {
        const rng = mulberry32(0x9abcdef + template.level);
        for (let i = 0; i < 100; i++) {
          const first = prepareQuestion(template.generate(rng), rng);
          const again = generateSimilar(template, first.prompt, rng);
          expect(again.prompt).not.toBe(first.prompt);
          expect(validateQuestion(again)).toEqual([]);
        }
      });
    });
  }
});

describe("chấm câu trả lời ngắn", () => {
  it("chấp nhận dấu phẩy, dấu chấm và phân số", () => {
    expect(parseNumericAnswer("1,5")).toBe(1.5);
    expect(parseNumericAnswer("1.5")).toBe(1.5);
    expect(parseNumericAnswer("-3/4")).toBe(-0.75);
    expect(parseNumericAnswer(" 2 ")).toBe(2);
    expect(parseNumericAnswer("abc")).toBeNull();
    expect(parseNumericAnswer("1/0")).toBeNull();
  });

  it("chấp nhận sai số nhỏ", () => {
    const question = {
      kind: "short" as const,
      templateId: "test",
      level: 1,
      topic: "test",
      title: "test",
      prompt: "test",
      answerLatex: "7/6",
      answerValue: 7 / 6,
      tolerance: 0.01,
      solution: ["a", "b"],
      params: {},
    };
    expect(checkShortAnswer(question, "7/6")).toBe(true);
    expect(checkShortAnswer(question, "1,1667")).toBe(true);
    expect(checkShortAnswer(question, "1,2")).toBe(false);
  });
});
