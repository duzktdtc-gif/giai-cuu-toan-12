import { makeMC, defineTemplate } from "./build";
import { polyLatex } from "./math";
import { pickOne, randInt, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Giá trị lớn nhất, nhỏ nhất và đường tiệm cận";

/** Màn 3 – mẫu 1: GTLN/GTNN của hàm bậc ba trên đoạn. */
const cubicOnSegment: QuestionTemplate = defineTemplate(
  { id: "l3-cubic-segment", level: 3, topic: TOPIC, title: "GTLN – GTNN của hàm bậc ba trên đoạn" },
  (rng = Math.random): GeneratedQuestion => {
    const a = randInt(rng, 1, 4);
    const c = randInt(rng, -4, 4);
    const polynomial = polyLatex([
      { c: 1, v: "x^3" },
      { c: -3 * a, v: "x^2" },
      { c },
    ]);
    const min = c - 4 * a ** 3;
    const mid = c - 2 * a ** 3;
    const askMax = rng() < 0.5;
    const correct = askMax ? c : min;

    return makeMC({
      template: cubicOnSegment,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Giá trị ${
        askMax ? "lớn nhất" : "nhỏ nhất"
      } của hàm số trên đoạn $\\left[0;${3 * a}\\right]$ bằng`,
      correctLatex: String(correct),
      distractors: askMax
        ? [String(min), String(mid), String(c + 4 * a ** 3)]
        : [String(c), String(mid), String(c + 4 * a ** 3)],
      params: { a, c, ask: askMax ? "max" : "min" },
      solution: [
        `Ta có $f'(x)=3x^2-${6 * a}x=3x(x-${2 * a})$; $f'(x)=0 \\Leftrightarrow x=0$ hoặc $x=${2 * a}$ (cả hai thuộc đoạn).`,
        `Tính $f(0)=${c}$, $f(${2 * a})=${min}$, $f(${3 * a})=${c}$.`,
        askMax
          ? `So sánh các giá trị, giá trị lớn nhất là $${c}$ (đạt tại $x=0$ và $x=${3 * a}$).`
          : `So sánh các giá trị, giá trị nhỏ nhất là $${min}$ (đạt tại $x=${2 * a}$).`,
      ],
    });
  },
);

/** Màn 3 – mẫu 2: các đường tiệm cận của hàm phân thức bậc nhất/bậc nhất. */
const rationalAsymptotes: QuestionTemplate = defineTemplate(
  { id: "l3-asymptotes", level: 3, topic: TOPIC, title: "Các đường tiệm cận của đồ thị hàm phân thức" },
  (rng = Math.random): GeneratedQuestion => {
    let a = randInt(rng, 1, 3);
    let c = randInt(rng, 2, 4);
    for (let i = 0; i < 10 && a === c; i++) {
      a = randInt(rng, 1, 3);
      c = randInt(rng, 2, 4);
    }
    let b = randInt(rng, -5, 5);
    for (let i = 0; i < 20 && a * c + b === 0; i++) b = randInt(rng, -5, 5);
    const numerator = polyLatex([{ c: a, v: "x" }, { c: b }]);
    const correct = `x=${c};\\ y=${a}`;

    return makeMC({
      template: rationalAsymptotes,
      prompt: `Cho hàm số $f(x)=\\dfrac{${numerator}}{x-${c}}$. Tìm tất cả các đường tiệm cận của đồ thị hàm số.`,
      correctLatex: correct,
      distractors: [`x=${-c};\\ y=${a}`, `x=${c};\\ y=${-a}`, `x=${a};\\ y=${c}`],
      params: { a, b, c },
      solution: [
        `Tập xác định: $D=\\mathbb{R}\\setminus\\{${c}\\}$. Vì $${a}\\cdot ${c}+${b}=${a * c + b}\\ne 0$ nên $x=${c}$ là tiệm cận đứng.`,
        `Bậc tử bằng bậc mẫu nên đồ thị có tiệm cận ngang là $y=\\dfrac{${a}}{1}=${a}$.`,
        `Vậy đồ thị có tiệm cận đứng $x=${c}$ và tiệm cận ngang $y=${a}$.`,
      ],
    });
  },
);

/** Màn 3 – mẫu 3: GTLN/GTNN của hàm bậc hai trên đoạn. */
const quadraticOnSegment: QuestionTemplate = defineTemplate(
  { id: "l3-quadratic-segment", level: 3, topic: TOPIC, title: "GTLN – GTNN của hàm bậc hai trên đoạn" },
  (rng = Math.random): GeneratedQuestion => {
    const a = randInt(rng, 2, 5);
    const b = randInt(rng, -4, 4);
    const convex = rng() < 0.5;
    const polynomial = convex
      ? polyLatex([
          { c: 1, v: "x^2" },
          { c: -2 * a, v: "x" },
          { c: b },
        ])
      : polyLatex([
          { c: -1, v: "x^2" },
          { c: 2 * a, v: "x" },
          { c: b },
        ]);
    const vertexValue = convex ? b - a * a : b + a * a;
    const opposite = convex ? b + a * a : b - a * a;
    const extreme = convex ? b - 2 * a * a : b + 2 * a * a;
    const word = convex ? "nhỏ nhất" : "lớn nhất";

    return makeMC({
      template: quadraticOnSegment,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Giá trị ${word} của hàm số trên đoạn $\\left[0;${2 * a}\\right]$ bằng`,
      correctLatex: String(vertexValue),
      distractors: [String(b), String(opposite), String(extreme)],
      params: { a, b, convex: convex ? "up" : "down" },
      solution: [
        `Ta có $f'(x)=${convex ? "2" : "-2"}(x-${a})$; $f'(x)=0 \\Leftrightarrow x=${a}\\in\\left[0;${2 * a}\\right]$.`,
        `Tính $f(0)=${b}$, $f(${2 * a})=${b}$, $f(${a})=${vertexValue}$.`,
        convex
          ? `Vậy giá trị nhỏ nhất là $${vertexValue}$ tại $x=${a}$.`
          : `Vậy giá trị lớn nhất là $${vertexValue}$ tại $x=${a}$.`,
      ],
    });
  },
);

/** Màn 3 – mẫu 4: trả lời ngắn, tổng hoành độ tiệm cận đứng và tung độ tiệm cận ngang. */
const asymptoteSum: QuestionTemplate = defineTemplate(
  { id: "l3-asymptote-sum", level: 3, topic: TOPIC, title: "Tổng tiệm cận đứng và ngang" },
  (rng = Math.random): GeneratedQuestion => {
    let a = randInt(rng, 1, 4);
    let c = randInt(rng, 2, 5);
    for (let i = 0; i < 10 && a === c; i++) {
      a = randInt(rng, 1, 4);
      c = randInt(rng, 2, 5);
    }
    let b = randInt(rng, -5, 5);
    for (let i = 0; i < 20 && a * c + b === 0; i++) b = randInt(rng, -5, 5);
    const numerator = polyLatex([{ c: a, v: "x" }, { c: b }]);

    return {
      kind: "short",
      templateId: asymptoteSum.id,
      level: 3,
      topic: TOPIC,
      title: asymptoteSum.title,
      prompt: `Cho hàm số $f(x)=\\dfrac{${numerator}}{x-${c}}$. Biết đồ thị hàm số có tiệm cận đứng $x=m$ và tiệm cận ngang $y=n$. Tính $m+n$.`,
      answerLatex: String(a + c),
      answerValue: a + c,
      tolerance: 0.001,
      params: { a, b, c },
      solution: [
        `Tập xác định: $D=\\mathbb{R}\\setminus\\{${c}\\}$; tử số tại $x=${c}$ bằng $${a * c + b}\\ne 0$ nên tiệm cận đứng là $x=${c}$, suy ra $m=${c}$.`,
        `Bậc tử bằng bậc mẫu nên tiệm cận ngang là $y=${a}$, suy ra $n=${a}$.`,
        `Vậy $m+n=${c}+${a}=${a + c}$.`,
      ],
    };
  },
);

export const level3Templates: QuestionTemplate[] = [
  cubicOnSegment,
  rationalAsymptotes,
  quadraticOnSegment,
  asymptoteSum,
];
