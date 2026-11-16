import { makeMC, defineTemplate } from "./build";
import { fracLatex, polyLatex } from "./math";
import { pickOne, randInt, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Tích phân (tính chất, đổi biến)";

/** Màn 5 – mẫu 1: tích phân xác định của hàm bậc nhất (trả lời ngắn). */
const linearDefiniteIntegral: QuestionTemplate = defineTemplate(
  { id: "l5-linear-definite", level: 5, topic: TOPIC, title: "Tích phân xác định của hàm bậc nhất" },
  (rng = Math.random): GeneratedQuestion => {
    const lower = pickOne(rng, [0, 1]);
    const upper = lower + randInt(rng, 1, 5);
    const a = 2 * randInt(rng, 1, 4);
    const b = randInt(rng, -3, 3);
    const value = (a / 2) * (upper ** 2 - lower ** 2) + b * (upper - lower);
    const integrand = polyLatex([{ c: a, v: "x" }, { c: b }]);

    return {
      kind: "short",
      templateId: linearDefiniteIntegral.id,
      level: 5,
      topic: TOPIC,
      title: linearDefiniteIntegral.title,
      prompt: `Tính tích phân $I=\\displaystyle\\int_{${lower}}^{${upper}}(${integrand})\\,dx$.`,
      answerLatex: String(value),
      answerValue: value,
      tolerance: 0.001,
      params: { lower, upper, a, b },
      solution: [
        `Một nguyên hàm của $${integrand}$ là $\\dfrac{${a}}{2}x^2+${b}x$.`,
        `$I=\\left[\\dfrac{${a}}{2}x^2+${b}x\\right]_{${lower}}^{${upper}}=\\left(\\dfrac{${a}}{2}\\cdot${upper ** 2}+${b}\\cdot${upper}\\right)-\\left(\\dfrac{${a}}{2}\\cdot${lower ** 2}+${b}\\cdot${lower}\\right)$.`,
        `$I=${value}$.`,
      ],
    };
  },
);

/** Màn 5 – mẫu 2: tính chất tuyến tính của tích phân. */
const linearityIntegral: QuestionTemplate = defineTemplate(
  { id: "l5-linearity", level: 5, topic: TOPIC, title: "Tính chất tuyến tính của tích phân" },
  (rng = Math.random): GeneratedQuestion => {
    let m = 1;
    let A = 0;
    let B = 0;
    let alpha = 1;
    let beta = 1;
    let value = 0;
    let distractors: number[] = [];
    for (let attempt = 0; attempt < 60; attempt++) {
      m = randInt(rng, 1, 5);
      A = randInt(rng, 1, 9);
      B = randInt(rng, 1, 9);
      alpha = pickOne(rng, [2, 3, -1, -2]);
      beta = pickOne(rng, [2, 3, -1, -2]);
      value = alpha * A + beta * B;
      distractors = [alpha * A - beta * B, alpha * B + beta * A, A + B];
      if (new Set([value, ...distractors]).size === 4) break;
    }
    const comboParts: string[] = [];
    const first = alpha === 1 ? "f(x)" : alpha === -1 ? "-f(x)" : `${alpha}f(x)`;
    comboParts.push(first);
    const betaAbs = Math.abs(beta);
    const second = betaAbs === 1 ? "g(x)" : `${betaAbs}g(x)`;
    comboParts.push(beta < 0 ? `-${second}` : `+${second}`);
    const combo = comboParts.join("");

    return makeMC({
      template: linearityIntegral,
      prompt: `Biết $\\displaystyle\\int_0^{${m}}f(x)\\,dx=${A}$ và $\\displaystyle\\int_0^{${m}}g(x)\\,dx=${B}$. Tính $I=\\displaystyle\\int_0^{${m}}\\left[${combo}\\right]dx$.`,
      correctLatex: String(value),
      distractors: distractors.map(String),
      params: { m, A, B, alpha, beta },
      solution: [
        `Sử dụng tính chất tuyến tính: $\\displaystyle\\int_a^b\\left[\\alpha f(x)+\\beta g(x)\\right]dx=\\alpha\\int_a^b f(x)dx+\\beta\\int_a^b g(x)dx$.`,
        `$I=${alpha}\\cdot${A}+(${beta})\\cdot${B}=${alpha * A}+(${beta * B})=${value}$.`,
      ],
    });
  },
);

/** Màn 5 – mẫu 3: tích phân lượng giác cơ bản trên [0; π/2]. */
const trigDefiniteIntegral: QuestionTemplate = defineTemplate(
  { id: "l5-trig-definite", level: 5, topic: TOPIC, title: "Tích phân lượng giác cơ bản" },
  (rng = Math.random): GeneratedQuestion => {
    let a = 1;
    let b = 1;
    let value = 0;
    let distractors: number[] = [];
    for (let attempt = 0; attempt < 60; attempt++) {
      a = randInt(rng, 1, 6);
      b = randInt(rng, 1, 6);
      value = a + b;
      distractors = [a - b, b - a, a * b];
      if (new Set([value, ...distractors]).size === 4) break;
    }

    return makeMC({
      template: trigDefiniteIntegral,
      prompt: `Tính tích phân $I=\\displaystyle\\int_0^{\\frac{\\pi}{2}}\\left(${a}\\sin x+${b}\\cos x\\right)dx$.`,
      correctLatex: String(value),
      distractors: distractors.map(String),
      params: { a, b },
      solution: [
        `$\\displaystyle\\int\\sin x\\,dx=-\\cos x+C$, $\\displaystyle\\int\\cos x\\,dx=\\sin x+C$.`,
        `$I=\\left[-${a}\\cos x+${b}\\sin x\\right]_0^{\\frac{\\pi}{2}}=\\left(0+${b}\\right)-\\left(-${a}+0\\right)=${a}+${b}=${value}$.`,
      ],
    });
  },
);

/** Màn 5 – mẫu 4: tích phân đổi biến u = x^2 + 1 (trả lời ngắn). */
const substitutionIntegral: QuestionTemplate = defineTemplate(
  { id: "l5-substitution", level: 5, topic: TOPIC, title: "Tích phân đổi biến u = x² + 1" },
  (rng = Math.random): GeneratedQuestion => {
    const upper = pickOne(rng, [1, 2]);
    const k = randInt(rng, 1, 3);
    const n = randInt(rng, 1, 3);
    const numerator = k * ((upper * upper + 1) ** (n + 1) - 1);
    const denominator = 2 * (n + 1);
    const value = numerator / denominator;
    const integrand = k === 1 ? `x(x^2+1)^{${n}}` : `${k}x(x^2+1)^{${n}}`;

    return {
      kind: "short",
      templateId: substitutionIntegral.id,
      level: 5,
      topic: TOPIC,
      title: substitutionIntegral.title,
      prompt: `Tính tích phân $I=\\displaystyle\\int_0^{${upper}}${integrand}\\,dx$. (Nhập phân số dạng a/b hoặc số thập phân.)`,
      answerLatex: fracLatex(numerator, denominator),
      answerValue: value,
      tolerance: 0.01,
      params: { upper, k, n, numerator, denominator },
      solution: [
        `Đặt $u=x^2+1$ thì $du=2x\\,dx$, suy ra $x\\,dx=\\dfrac{du}{2}$. Khi $x=0$ thì $u=1$; khi $x=${upper}$ thì $u=${upper * upper + 1}$.`,
        `$I=${k}\\displaystyle\\int_1^{${upper * upper + 1}}u^{${n}}\\cdot\\dfrac{du}{2}=\\dfrac{${k}}{2}\\left[\\dfrac{u^{${n + 1}}}{${n + 1}}\\right]_1^{${upper * upper + 1}}$.`,
        `$I=\\dfrac{${k}}{${denominator}}\\left(${upper * upper + 1}^{${n + 1}}-1\\right)=\\dfrac{${numerator}}{${denominator}}=${fracLatex(numerator, denominator)}$.`,
      ],
    };
  },
);

export const level5Templates: QuestionTemplate[] = [
  linearDefiniteIntegral,
  linearityIntegral,
  trigDefiniteIntegral,
  substitutionIntegral,
];
