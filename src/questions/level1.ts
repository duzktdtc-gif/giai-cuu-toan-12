import { makeMC, defineTemplate } from "./build";
import { intervalLatex, polyLatex, unionLatex } from "./math";
import { pickOne, randInt, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Tính đơn điệu của hàm số";

function factorRoot(root: number, variable = "x"): string {
  if (root === 0) return `(${variable})`;
  return root > 0 ? `(${variable}-${root})` : `(${variable}+${-root})`;
}

function cubicData(rng: RNG) {
  const p = randInt(rng, -4, 3);
  const q = p + 2 * randInt(rng, 1, 3);
  const c = randInt(rng, -3, 3);
  const a2 = (-3 * (p + q)) / 2;
  const a1 = 3 * p * q;
  const polynomial = polyLatex([
    { c: 1, v: "x^3" },
    { c: a2, v: "x^2" },
    { c: a1, v: "x" },
    { c },
  ]);
  const derivative = polyLatex([
    { c: 3, v: "x^2" },
    { c: -3 * (p + q), v: "x" },
    { c: 3 * p * q },
  ]);
  const params = { p, q, c, a2, a1 };
  return { p, q, c, polynomial, derivative, params };
}

/** Màn 1 – mẫu 1: khoảng đơn điệu của hàm bậc ba có đạo hàm hai nghiệm đẹp. */
const cubicMonotonic: QuestionTemplate = defineTemplate(
  { id: "l1-cubic-interval", level: 1, topic: TOPIC, title: "Khoảng đơn điệu của hàm bậc ba" },
  (rng = Math.random): GeneratedQuestion => {
    const { p, q, polynomial, derivative, params } = cubicData(rng);
    const askIncrease = rng() < 0.5;
    const correct = askIncrease
      ? unionLatex(intervalLatex("-\\infty", p), intervalLatex(q, "+\\infty"))
      : intervalLatex(p, q);
    const distractors = askIncrease
      ? [intervalLatex(p, q), intervalLatex("-\\infty", q), intervalLatex(p, "+\\infty")]
      : [intervalLatex(q, "+\\infty"), intervalLatex("-\\infty", p), intervalLatex(p, "+\\infty")];

    return makeMC({
      template: cubicMonotonic,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Hàm số đã cho ${
        askIncrease ? "đồng biến" : "nghịch biến"
      } trên khoảng nào dưới đây?`,
      correctLatex: correct,
      distractors,
      params: { ...params, ask: askIncrease ? "increase" : "decrease" },
      solution: [
        `Tập xác định: $D=\\mathbb{R}$. Ta có $f'(x)=${derivative}=3${factorRoot(p)}${factorRoot(q)}$.`,
        `$f'(x)=0 \\Leftrightarrow x=${p}$ hoặc $x=${q}$. Vì hệ số $a=3>0$ nên $f'(x)>0$ ở ngoài khoảng hai nghiệm và $f'(x)<0$ giữa hai nghiệm.`,
        askIncrease
          ? `Vậy hàm số đồng biến trên $${intervalLatex("-\\infty", p)}$ và $${intervalLatex(q, "+\\infty")}$.`
          : `Vậy hàm số nghịch biến trên $${intervalLatex(p, q)}$.`,
      ],
    });
  },
);

/** Màn 1 – mẫu 2: hàm x + k^2/x. */
const hyperbolaMonotonic: QuestionTemplate = defineTemplate(
  { id: "l1-hyperbola-interval", level: 1, topic: TOPIC, title: "Khoảng đơn điệu của hàm x + a/x" },
  (rng = Math.random): GeneratedQuestion => {
    const k = randInt(rng, 2, 5);
    const a = k * k;
    const askIncrease = rng() < 0.5;
    const correct = askIncrease ? intervalLatex(k, "+\\infty") : intervalLatex(0, k);
    const distractors = askIncrease
      ? [intervalLatex(0, k), intervalLatex(-k, 0), intervalLatex(-k, k)]
      : [intervalLatex(k, "+\\infty"), intervalLatex("-\\infty", -k), intervalLatex(0, "+\\infty")];

    return makeMC({
      template: hyperbolaMonotonic,
      prompt: `Cho hàm số $f(x)=x+\\dfrac{${a}}{x}$ (với $x\\ne 0$). Hàm số đã cho ${
        askIncrease ? "đồng biến" : "nghịch biến"
      } trên khoảng nào dưới đây?`,
      correctLatex: correct,
      distractors,
      params: { k, a, ask: askIncrease ? "increase" : "decrease" },
      solution: [
        `Tập xác định: $D=\\mathbb{R}\\setminus\\{0\\}$. Ta có $f'(x)=1-\\dfrac{${a}}{x^2}=\\dfrac{x^2-${a}}{x^2}=\\dfrac{(x-${k})(x+${k})}{x^2}$.`,
        `$f'(x)=0 \\Leftrightarrow x=\\pm ${k}$. Trên từng khoảng xác định, dấu của $f'(x)$ chỉ phụ thuộc tử số $x^2-${a}$.`,
        askIncrease
          ? `Vậy hàm số đồng biến trên $${intervalLatex("-\\infty", -k)}$ và $${intervalLatex(k, "+\\infty")}$; trong các khoảng được nêu, $${intervalLatex(k, "+\\infty")}$ là khoảng đồng biến.`
          : `Vậy hàm số nghịch biến trên $${intervalLatex(-k, 0)}$ và $${intervalLatex(0, k)}$; trong các khoảng được nêu, $${intervalLatex(0, k)}$ là khoảng nghịch biến.`,
      ],
    });
  },
);

/** Màn 1 – mẫu 3: hàm bậc ba dạng -x^3 + 3ax^2 + b. */
const cubicNegativeMonotonic: QuestionTemplate = defineTemplate(
  { id: "l1-cubic-negative", level: 1, topic: TOPIC, title: "Khoảng đơn điệu của hàm bậc ba hệ số âm" },
  (rng = Math.random): GeneratedQuestion => {
    const a = randInt(rng, 2, 5);
    const b = randInt(rng, -3, 3);
    const polynomial = polyLatex([
      { c: -1, v: "x^3" },
      { c: 3 * a, v: "x^2" },
      { c: b },
    ]);
    const askIncrease = rng() < 0.5;
    const correct = askIncrease
      ? intervalLatex(0, 2 * a)
      : unionLatex(intervalLatex("-\\infty", 0), intervalLatex(2 * a, "+\\infty"));
    const distractors = askIncrease
      ? [intervalLatex(2 * a, "+\\infty"), intervalLatex("-\\infty", 0), intervalLatex(0, "+\\infty")]
      : [intervalLatex(0, 2 * a), intervalLatex(0, "+\\infty"), intervalLatex("-\\infty", 2 * a)];

    return makeMC({
      template: cubicNegativeMonotonic,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Hàm số đã cho ${
        askIncrease ? "đồng biến" : "nghịch biến"
      } trên khoảng nào dưới đây?`,
      correctLatex: correct,
      distractors,
      params: { a, b, ask: askIncrease ? "increase" : "decrease" },
      solution: [
        `Tập xác định: $D=\\mathbb{R}$. Ta có $f'(x)=-3x^2+${6 * a}x=-3x(x-${2 * a})$.`,
        `$f'(x)=0 \\Leftrightarrow x=0$ hoặc $x=${2 * a}$. Vì hệ số $a=-3<0$ nên $f'(x)>0$ giữa hai nghiệm và $f'(x)<0$ ở ngoài.`,
        askIncrease
          ? `Vậy hàm số đồng biến trên $${intervalLatex(0, 2 * a)}$.`
          : `Vậy hàm số nghịch biến trên $${intervalLatex("-\\infty", 0)}$ và $${intervalLatex(2 * a, "+\\infty")}$.`,
      ],
    });
  },
);

/** Màn 1 – mẫu 4: trả lời ngắn, tính độ dài khoảng nghịch biến. */
const cubicIntervalLength: QuestionTemplate = defineTemplate(
  { id: "l1-interval-length", level: 1, topic: TOPIC, title: "Độ dài khoảng nghịch biến" },
  (rng = Math.random): GeneratedQuestion => {
    const { p, q, polynomial, derivative, params } = cubicData(rng);
    return {
      kind: "short",
      templateId: cubicIntervalLength.id,
      level: 1,
      topic: TOPIC,
      title: cubicIntervalLength.title,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Biết hàm số nghịch biến trên khoảng $(a;b)$ với $a<b$. Tính $b-a$.`,
      answerLatex: String(q - p),
      answerValue: q - p,
      tolerance: 0.001,
      params,
      solution: [
        `Ta có $f'(x)=${derivative}=3${factorRoot(p)}${factorRoot(q)}$.`,
        `$f'(x)<0 \\Leftrightarrow ${p}<x<${q}$ nên hàm số nghịch biến trên $${intervalLatex(p, q)}$.`,
        `Suy ra $a=${p}$, $b=${q}$ và $b-a=${q - p}$.`,
      ],
    };
  },
);

export const level1Templates: QuestionTemplate[] = [
  cubicMonotonic,
  hyperbolaMonotonic,
  cubicNegativeMonotonic,
  cubicIntervalLength,
];
