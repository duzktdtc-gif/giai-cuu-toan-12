import { makeMC, defineTemplate } from "./build";
import { polyLatex } from "./math";
import { randInt, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Cực trị của hàm số";

function factorRoot(root: number): string {
  if (root === 0) return "(x)";
  return root > 0 ? `(x-${root})` : `(x+${-root})`;
}

function cubicWithRoots(rng: RNG) {
  const p = randInt(rng, -4, 3);
  const q = p + 2 * randInt(rng, 1, 3);
  const c = randInt(rng, -4, 4);
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
  const f = (x: number) => x ** 3 + a2 * x ** 2 + a1 * x + c;
  return { p, q, c, polynomial, derivative, f, params: { p, q, c, a2, a1 } };
}

/** Màn 2 – mẫu 1: toạ độ điểm cực đại của hàm bậc ba. */
const cubicMaxPoint: QuestionTemplate = defineTemplate(
  { id: "l2-cubic-max-point", level: 2, topic: TOPIC, title: "Toạ độ điểm cực đại của hàm bậc ba" },
  (rng = Math.random): GeneratedQuestion => {
    let data = cubicWithRoots(rng);
    // tránh p = 0 (khi đó cực đại tại gốc, đáp án dễ trùng với hằng số tự do)
    for (let i = 0; i < 20 && data.p === 0; i++) data = cubicWithRoots(rng);
    const { p, q, polynomial, derivative, f, params } = data;
    const correct = `\\left(${p};${f(p)}\\right)`;

    return makeMC({
      template: cubicMaxPoint,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Toạ độ điểm cực đại của đồ thị hàm số là`,
      correctLatex: correct,
      distractors: [
        `\\left(${q};${f(q)}\\right)`,
        `\\left(${p};${f(q)}\\right)`,
        `\\left(${q};${f(p)}\\right)`,
      ],
      params,
      solution: [
        `Tập xác định: $D=\\mathbb{R}$. Ta có $f'(x)=${derivative}=3${factorRoot(p)}${factorRoot(q)}$.`,
        `$f'(x)=0 \\Leftrightarrow x=${p}$ hoặc $x=${q}$. Hệ số $a=3>0$ nên dấu $f'(x)$ là $+,-,+$ khi đi qua các nghiệm theo thứ tự.`,
        `Do đó hàm số đạt cực đại tại $x=${p}$ và cực tiểu tại $x=${q}$. Giá trị cực đại: $f(${p})=${f(p)}$.`,
        `Vậy toạ độ điểm cực đại là $${correct}$.`,
      ],
    });
  },
);

/** Màn 2 – mẫu 2: giá trị cực tiểu của hàm trùng phương. */
const quarticMinValue: QuestionTemplate = defineTemplate(
  { id: "l2-quartic-min", level: 2, topic: TOPIC, title: "Giá trị cực tiểu của hàm trùng phương" },
  (rng = Math.random): GeneratedQuestion => {
    const k = randInt(rng, 2, 4);
    const c = randInt(rng, -4, 4);
    const k2 = k * k;
    const min = c - k ** 4;
    const polynomial = polyLatex([
      { c: 1, v: "x^4" },
      { c: -2 * k2, v: "x^2" },
      { c },
    ]);

    return makeMC({
      template: quarticMinValue,
      prompt: `Cho hàm số $f(x)=${polynomial}$. Giá trị cực tiểu của hàm số bằng`,
      correctLatex: String(min),
      distractors: [String(c), String(c + k ** 4), String(c - 2 * k ** 4)],
      params: { k, c, k2 },
      solution: [
        `Tập xác định: $D=\\mathbb{R}$. Ta có $f'(x)=4x^3-${4 * k2}x=4x(x-${k})(x+${k})$.`,
        `$f'(x)=0 \\Leftrightarrow x=0$ hoặc $x=\\pm ${k}$. Dấu của $f'(x)$ lần lượt là $-,+,-,+$ trên các khoảng $(-\\infty;-${k})$, $(-${k};0)$, $(0;${k})$, $(${k};+\\infty)$.`,
        `Vậy hàm số đạt cực tiểu tại $x=\\pm ${k}$, giá trị cực tiểu $f(\\pm ${k})=${min}$. (Giá trị cực đại là $${c}$ tại $x=0$.)`,
      ],
    });
  },
);

/** Màn 2 – mẫu 3: cực trị của hàm x + k^2/x. */
const hyperbolaExtrema: QuestionTemplate = defineTemplate(
  { id: "l2-hyperbola-extrema", level: 2, topic: TOPIC, title: "Cực trị của hàm x + a/x" },
  (rng = Math.random): GeneratedQuestion => {
    const k = randInt(rng, 3, 6);
    const a = k * k;

    return makeMC({
      template: hyperbolaExtrema,
      prompt: `Cho hàm số $f(x)=x+\\dfrac{${a}}{x}$ (với $x\\ne 0$). Giá trị cực tiểu của hàm số bằng`,
      correctLatex: String(2 * k),
      distractors: [String(-2 * k), String(a), String(2 * a)],
      params: { k, a },
      solution: [
        `Tập xác định: $D=\\mathbb{R}\\setminus\\{0\\}$. Ta có $f'(x)=1-\\dfrac{${a}}{x^2}=\\dfrac{x^2-${a}}{x^2}=\\dfrac{(x-${k})(x+${k})}{x^2}$.`,
        `$f'(x)=0 \\Leftrightarrow x=\\pm ${k}$. Dấu $f'(x)$ là $+,-,-,+$ trên $(-\\infty;-${k})$, $(-${k};0)$, $(0;${k})$, $(${k};+\\infty)$.`,
        `Vậy hàm số đạt cực tiểu tại $x=${k}$, giá trị cực tiểu $f(${k})=${k}+\\dfrac{${a}}{${k}}=${2 * k}$.`,
      ],
    });
  },
);

/** Màn 2 – mẫu 4: trả lời ngắn, khoảng cách hai điểm cực tiểu. */
const quarticMinDistance: QuestionTemplate = defineTemplate(
  { id: "l2-quartic-distance", level: 2, topic: TOPIC, title: "Khoảng cách hai điểm cực tiểu" },
  (rng = Math.random): GeneratedQuestion => {
    const k = randInt(rng, 2, 5);
    const c = randInt(rng, -4, 4);
    const polynomial = polyLatex([
      { c: 1, v: "x^4" },
      { c: -2 * k * k, v: "x^2" },
      { c },
    ]);

    return {
      kind: "short",
      templateId: quarticMinDistance.id,
      level: 2,
      topic: TOPIC,
      title: quarticMinDistance.title,
      prompt: `Cho hàm số $f(x)=${polynomial}$ có đồ thị $(C)$. Gọi $A$ và $B$ là hai điểm cực tiểu của $(C)$. Tính độ dài đoạn thẳng $AB$.`,
      answerLatex: String(2 * k),
      answerValue: 2 * k,
      tolerance: 0.001,
      params: { k, c },
      solution: [
        `Ta có $f'(x)=4x(x-${k})(x+${k})$; $f'(x)=0 \\Leftrightarrow x=0$ hoặc $x=\\pm ${k}$.`,
        `Hai điểm cực tiểu là $A(-${k};${c - k ** 4})$ và $B(${k};${c - k ** 4})$ nên $AB$ nằm ngang.`,
        `Vậy $AB=${k}-(-${k})=${2 * k}$.`,
      ],
    };
  },
);

export const level2Templates: QuestionTemplate[] = [
  cubicMaxPoint,
  quarticMinValue,
  hyperbolaExtrema,
  quarticMinDistance,
];
