import { makeMC, defineTemplate } from "./build";
import { polyLatex } from "./math";
import { pickOne, randInt, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Nguyên hàm";

/** Màn 4 – mẫu 1: nguyên hàm của đa thức. */
const polynomialAntiderivative: QuestionTemplate = defineTemplate(
  { id: "l4-polynomial", level: 4, topic: TOPIC, title: "Nguyên hàm của hàm đa thức" },
  (rng = Math.random): GeneratedQuestion => {
    const n = randInt(rng, 2, 4);
    const k = randInt(rng, 1, 3);
    const a = k * (n + 1);
    const m = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
    const b = 2 * m;
    const c = pickOne(rng, [-4, -3, -2, -1, 1, 2, 3, 4]);
    const f = polyLatex([
      { c: a, v: `x^${n}` },
      { c: b, v: "x" },
      { c },
    ]);
    const antiderivative = polyLatex([
      { c: k, v: `x^${n + 1}` },
      { c: m, v: "x^2" },
      { c, v: "x" },
    ]);
    const forgotPower = polyLatex([
      { c: k, v: `x^${n}` },
      { c: m, v: "x^2" },
      { c, v: "x" },
    ]);
    const forgotDivide = polyLatex([
      { c: a, v: `x^${n + 1}` },
      { c: m, v: "x^2" },
      { c, v: "x" },
    ]);

    return makeMC({
      template: polynomialAntiderivative,
      prompt: `Họ nguyên hàm của hàm số $f(x)=${f}$ là`,
      correctLatex: `${antiderivative}+C`,
      distractors: [antiderivative, `${forgotDivide}+C`, `${forgotPower}+C`],
      params: { n, k, a, m, b, c },
      solution: [
        `Áp dụng $\\displaystyle\\int x^{${n}}\\,dx=\\dfrac{x^{${n + 1}}}{${n + 1}}+C$ và $\\displaystyle\\int x\\,dx=\\dfrac{x^2}{2}+C$.`,
        `$\\displaystyle\\int\\left(${f}\\right)dx=\\dfrac{${a}}{${n + 1}}x^{${n + 1}}+\\dfrac{${b}}{2}x^2+${c}x+C`,
        `$=${k}x^{${n + 1}}+${m}x^2+${c}x+C$.`,
        `Vậy họ nguyên hàm là $${antiderivative}+C$.`,
      ],
    });
  },
);

/** Màn 4 – mẫu 2: nguyên hàm của (ax+b)^n. */
const linearPowerAntiderivative: QuestionTemplate = defineTemplate(
  { id: "l4-linear-power", level: 4, topic: TOPIC, title: "Nguyên hàm của (ax + b)^n" },
  (rng = Math.random): GeneratedQuestion => {
    const a = randInt(rng, 2, 3);
    const b = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
    const n = randInt(rng, 2, 4);
    const inner = polyLatex([{ c: a, v: "x" }, { c: b }]);
    const denominator = a * (n + 1);
    const correct = `\\dfrac{(${inner})^{${n + 1}}}{${denominator}}+C`;

    return makeMC({
      template: linearPowerAntiderivative,
      prompt: `Họ nguyên hàm của hàm số $f(x)=(${inner})^{${n}}$ là`,
      correctLatex: correct,
      distractors: [
        `\\dfrac{(${inner})^{${n + 1}}}{${n + 1}}+C`,
        `\\dfrac{(${inner})^{${n + 1}}}{${denominator}}`,
        `\\dfrac{(${inner})^{${n + 1}}}{${a * n}}+C`,
      ],
      params: { a, b, n },
      solution: [
        `Đặt $u=${inner}$ thì $du=${a}\\,dx$, suy ra $dx=\\dfrac{du}{${a}}$.`,
        `$\\displaystyle\\int u^{${n}}\\cdot\\dfrac{du}{${a}}=\\dfrac{1}{${a}}\\cdot\\dfrac{u^{${n + 1}}}{${n + 1}}+C$.`,
        `Thay $u=${inner}$: $\\displaystyle\\int(${inner})^{${n}}dx=\\dfrac{(${inner})^{${n + 1}}}{${denominator}}+C$.`,
      ],
    });
  },
);

/** Màn 4 – mẫu 3: nguyên hàm lượng giác / hàm mũ. */
const trigExpAntiderivative: QuestionTemplate = defineTemplate(
  { id: "l4-trig-exp", level: 4, topic: TOPIC, title: "Nguyên hàm lượng giác và hàm mũ" },
  (rng = Math.random): GeneratedQuestion => {
    const type = pickOne(rng, ["sin", "cos", "exp"] as const);
    const a = randInt(rng, 2, 4);
    const argument = `${a}x`;

    if (type === "sin") {
      return makeMC({
        template: trigExpAntiderivative,
        prompt: `Họ nguyên hàm của hàm số $f(x)=\\sin ${argument}$ là`,
        correctLatex: `-\\dfrac{\\cos ${argument}}{${a}}+C`,
        distractors: [
          `\\dfrac{\\cos ${argument}}{${a}}+C`,
          `-\\cos ${argument}+C`,
          `-\\dfrac{\\sin ${argument}}{${a}}+C`,
        ],
        params: { type, a },
        solution: [
          `Áp dụng $\\displaystyle\\int\\sin(ax)\\,dx=-\\dfrac{1}{a}\\cos(ax)+C$ với $a=${a}$.`,
          `Vậy $\\displaystyle\\int\\sin ${argument}\\,dx=-\\dfrac{\\cos ${argument}}{${a}}+C$.`,
        ],
      });
    }
    if (type === "cos") {
      return makeMC({
        template: trigExpAntiderivative,
        prompt: `Họ nguyên hàm của hàm số $f(x)=\\cos ${argument}$ là`,
        correctLatex: `\\dfrac{\\sin ${argument}}{${a}}+C`,
        distractors: [
          `-\\dfrac{\\sin ${argument}}{${a}}+C`,
          `\\sin ${argument}+C`,
          `\\dfrac{\\cos ${argument}}{${a}}+C`,
        ],
        params: { type, a },
        solution: [
          `Áp dụng $\\displaystyle\\int\\cos(ax)\\,dx=\\dfrac{1}{a}\\sin(ax)+C$ với $a=${a}$.`,
          `Vậy $\\displaystyle\\int\\cos ${argument}\\,dx=\\dfrac{\\sin ${argument}}{${a}}+C$.`,
        ],
      });
    }
    return makeMC({
      template: trigExpAntiderivative,
      prompt: `Họ nguyên hàm của hàm số $f(x)=e^{${argument}}$ là`,
      correctLatex: `\\dfrac{e^{${argument}}}{${a}}+C`,
      distractors: [`${a}e^{${argument}}+C`, `e^{${argument}}+C`, `\\dfrac{e^{${argument}}}{${a + 1}}+C`],
      params: { type, a },
      solution: [
        `Áp dụng $\\displaystyle\\int e^{ax}\\,dx=\\dfrac{1}{a}e^{ax}+C$ với $a=${a}$.`,
        `Vậy $\\displaystyle\\int e^{${argument}}\\,dx=\\dfrac{e^{${argument}}}{${a}}+C$.`,
      ],
    });
  },
);

/** Màn 4 – mẫu 4: trả lời ngắn, tìm F(1) khi biết F(0). */
const antiderivativeAtPoint: QuestionTemplate = defineTemplate(
  { id: "l4-F-at-1", level: 4, topic: TOPIC, title: "Tìm giá trị nguyên hàm tại một điểm" },
  (rng = Math.random): GeneratedQuestion => {
    const k = randInt(rng, 1, 4);
    const a = 3 * k;
    const b = randInt(rng, -4, 4);
    const c = randInt(rng, -4, 4);
    const f = polyLatex([
      { c: a, v: "x^2" },
      { c: b },
    ]);
    const value = k + b + c;

    return {
      kind: "short",
      templateId: antiderivativeAtPoint.id,
      level: 4,
      topic: TOPIC,
      title: antiderivativeAtPoint.title,
      prompt: `Cho hàm số $f(x)=${f}$. Biết $F(x)$ là một nguyên hàm của $f(x)$ trên $\\mathbb{R}$ và $F(0)=${c}$. Tính $F(1)$.`,
      answerLatex: String(value),
      answerValue: value,
      tolerance: 0.001,
      params: { k, a, b, c },
      solution: [
        `$F(x)=\\displaystyle\\int(${f})dx=${k}x^3+${b}x+C$.`,
        `Vì $F(0)=${c}$ nên $C=${c}$, do đó $F(x)=${k}x^3+${b}x+${c}$.`,
        `Suy ra $F(1)=${k}+${b}+${c}=${value}$.`,
      ],
    };
  },
);

export const level4Templates: QuestionTemplate[] = [
  polynomialAntiderivative,
  linearPowerAntiderivative,
  trigExpAntiderivative,
  antiderivativeAtPoint,
];
