import { makeMC, defineTemplate } from "./build";
import { fracLatex, polyLatex } from "./math";
import { pickOne, randInt, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Tổng hợp: diện tích, thể tích, xác suất có điều kiện";

/** Màn 7 – mẫu 1: diện tích hình phẳng giới hạn bởi parabol và trục Ox (trả lời ngắn). */
const parabolaArea: QuestionTemplate = defineTemplate(
  { id: "l7-parabola-area", level: 7, topic: TOPIC, title: "Diện tích hình phẳng giới hạn bởi parabol" },
  (rng = Math.random): GeneratedQuestion => {
    const k = pickOne(rng, [2, 4]);
    const a = pickOne(rng, [3, 6, 9]);
    const area = (k * a ** 3) / 6;
    const polynomial = polyLatex([
      { c: -k, v: "x^2" },
      { c: k * a, v: "x" },
    ]);

    return {
      kind: "short",
      templateId: parabolaArea.id,
      level: 7,
      topic: TOPIC,
      title: parabolaArea.title,
      prompt: `Tính diện tích $S$ của hình phẳng giới hạn bởi đồ thị hàm số $y=${polynomial}$ và trục $Ox$.`,
      answerLatex: String(area),
      answerValue: area,
      tolerance: 0.001,
      params: { k, a, area },
      solution: [
        `Phương trình hoành độ giao điểm: $${polynomial}=0 \\Leftrightarrow ${k}x(${a}-x)=0 \\Leftrightarrow x=0$ hoặc $x=${a}$.`,
        `Trên khoảng $(0;${a})$, $y>0$, nên $S=\\displaystyle\\int_0^{${a}}\\left(${polynomial}\\right)dx=\\left[\\dfrac{${k * a}}{2}x^2-\\dfrac{${k}}{3}x^3\\right]_0^{${a}}$.`,
        `$S=\\dfrac{${k * a}\\cdot${a ** 2}}{2}-\\dfrac{${k}\\cdot${a ** 3}}{3}=\\dfrac{${k * a ** 3}}{2}-\\dfrac{${k * a ** 3}}{3}=\\dfrac{${k * a ** 3}}{6}=${area}$.`,
      ],
    };
  },
);

/** Màn 7 – mẫu 2: thể tích khối tròn xoay. */
const revolutionVolume: QuestionTemplate = defineTemplate(
  { id: "l7-revolution-volume", level: 7, topic: TOPIC, title: "Thể tích khối tròn xoay" },
  (rng = Math.random): GeneratedQuestion => {
    let k = 2;
    let a = 2;
    let coefficient = 1;
    let distractors: string[] = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      k = pickOne(rng, [2, 4]);
      a = pickOne(rng, [2, 4, 6]);
      coefficient = (k * a * a) / 2;
      const d1 = 2 * coefficient;
      const d2 = (k * a ** 3) / 2;
      const d3 = (k * a) / 2;
      const values = new Set([coefficient, d1, d2, d3]);
      if (values.size === 4) {
        distractors = [d1, d2, d3].map((value) => `${value}\\pi`);
        break;
      }
    }

    return makeMC({
      template: revolutionVolume,
      prompt: `Cho hình phẳng giới hạn bởi đồ thị $y=\\sqrt{${k}x}$, trục hoành và đường thẳng $x=${a}$. Tính thể tích $V$ của khối tròn xoay tạo thành khi quay hình phẳng đó quanh trục $Ox$.`,
      correctLatex: `${coefficient}\\pi`,
      distractors,
      params: { k, a, coefficient },
      solution: [
        `Thể tích $V=\\pi\\displaystyle\\int_0^{${a}}y^2\\,dx=\\pi\\int_0^{${a}}${k}x\\,dx$.`,
        `$V=\\pi\\left[\\dfrac{${k}}{2}x^2\\right]_0^{${a}}=\\pi\\cdot\\dfrac{${k}\\cdot${a ** 2}}{2}=${coefficient}\\pi$.`,
      ],
    });
  },
);

/** Màn 7 – mẫu 3: xác suất có điều kiện với bi không hoàn lại. */
const conditionalProbability: QuestionTemplate = defineTemplate(
  { id: "l7-conditional-prob", level: 7, topic: TOPIC, title: "Xác suất có điều kiện" },
  (rng = Math.random): GeneratedQuestion => {
    let red = 2;
    let blue = 1;
    let correct = "";
    let distractors: string[] = [];
    for (let attempt = 0; attempt < 80; attempt++) {
      red = randInt(rng, 2, 9);
      blue = randInt(rng, 1, 9);
      const correctFrac = fracLatex(red - 1, red + blue - 1);
      const d1 = fracLatex(red, red + blue);
      const d2 = fracLatex(red - 1, red + blue);
      const d3 = fracLatex(red, red + blue - 1);
      const values = new Set([correctFrac, d1, d2, d3]);
      if (values.size === 4) {
        correct = correctFrac;
        distractors = [d1, d2, d3];
        break;
      }
    }

    return makeMC({
      template: conditionalProbability,
      prompt: `Một hộp có ${red} viên bi đỏ và ${blue} viên bi xanh, các viên bi có kích thước và khối lượng như nhau. Lấy ngẫu nhiên lần lượt 2 viên bi không hoàn lại. Biết viên bi thứ nhất lấy được là bi đỏ, xác suất để viên bi thứ hai cũng là bi đỏ bằng`,
      correctLatex: correct,
      distractors,
      params: { red, blue },
      solution: [
        `Gọi $A$: "viên thứ nhất là bi đỏ", $B$: "viên thứ hai là bi đỏ". Ta cần $P(B\\mid A)=\\dfrac{P(A\\cap B)}{P(A)}$.`,
        `Sau khi lấy viên đỏ đầu tiên, trong hộp còn $${red - 1}$ bi đỏ và $${blue}$ bi xanh, tổng cộng $${red + blue - 1}$ viên.`,
        `Vậy $P(B\\mid A)=\\dfrac{${red - 1}}{${red + blue - 1}}=${correct}$.`,
      ],
    });
  },
);

export const level7Templates: QuestionTemplate[] = [
  parabolaArea,
  revolutionVolume,
  conditionalProbability,
];
