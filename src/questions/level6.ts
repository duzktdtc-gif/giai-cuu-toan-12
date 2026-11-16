import { makeMC, defineTemplate } from "./build";
import { polyLatex } from "./math";
import { pickOne, randInt, shuffle, type RNG } from "./rng";
import type { GeneratedQuestion, QuestionTemplate } from "./types";

const TOPIC = "Phương pháp tọa độ trong không gian Oxyz";

const PYTHAGOREAN_3D: Array<{ d: [number, number, number]; length: number }> = [
  { d: [1, 2, 2], length: 3 },
  { d: [2, 3, 6], length: 7 },
  { d: [1, 4, 8], length: 9 },
  { d: [3, 4, 12], length: 13 },
  { d: [2, 6, 9], length: 11 },
  { d: [4, 4, 7], length: 9 },
];

function pointLatex(p: [number, number, number]): string {
  return `(${p[0]};${p[1]};${p[2]})`;
}

/** Màn 6 – mẫu 1: độ dài đoạn thẳng trong không gian (trả lời ngắn). */
const distanceBetweenPoints: QuestionTemplate = defineTemplate(
  { id: "l6-distance", level: 6, topic: TOPIC, title: "Độ dài đoạn thẳng trong không gian" },
  (rng = Math.random): GeneratedQuestion => {
    const triple = pickOne(rng, PYTHAGOREAN_3D);
    const signs = [rng() < 0.5 ? -1 : 1, rng() < 0.5 ? -1 : 1, rng() < 0.5 ? -1 : 1];
    const diff = shuffle(rng, triple.d.map((value, index) => value * signs[index])) as [
      number,
      number,
      number,
    ];
    const A: [number, number, number] = [randInt(rng, -2, 3), randInt(rng, -2, 3), randInt(rng, -2, 3)];
    const B: [number, number, number] = [A[0] + diff[0], A[1] + diff[1], A[2] + diff[2]];

    return {
      kind: "short",
      templateId: distanceBetweenPoints.id,
      level: 6,
      topic: TOPIC,
      title: distanceBetweenPoints.title,
      prompt: `Trong không gian $Oxyz$, cho hai điểm $A${pointLatex(A)}$ và $B${pointLatex(B)}$. Tính độ dài đoạn thẳng $AB$.`,
      answerLatex: String(triple.length),
      answerValue: triple.length,
      tolerance: 0.001,
      params: { Ax: A[0], Ay: A[1], Az: A[2], Bx: B[0], By: B[1], Bz: B[2], length: triple.length },
      solution: [
        `$\\overrightarrow{AB}=\\left(${B[0] - A[0]};${B[1] - A[1]};${B[2] - A[2]}\\right)$.`,
        `$AB=\\sqrt{(${B[0] - A[0]})^2+(${B[1] - A[1]})^2+(${B[2] - A[2]})^2}=\\sqrt{${(B[0] - A[0]) ** 2}+${(B[1] - A[1]) ** 2}+${(B[2] - A[2]) ** 2}}$.`,
        `$AB=\\sqrt{${triple.length ** 2}}=${triple.length}$.`,
      ],
    };
  },
);

/** Màn 6 – mẫu 2: phương trình mặt phẳng đi qua điểm, biết vectơ pháp tuyến. */
const planeEquation: QuestionTemplate = defineTemplate(
  { id: "l6-plane", level: 6, topic: TOPIC, title: "Phương trình mặt phẳng" },
  (rng = Math.random): GeneratedQuestion => {
    let a = 0;
    let b = 0;
    let c = 0;
    for (let i = 0; i < 40 && (a === 0 || b === 0 || c === 0 || (a === b && b === c)); i++) {
      a = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
      b = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
      c = pickOne(rng, [-3, -2, -1, 1, 2, 3]);
    }
    const M: [number, number, number] = [randInt(rng, -2, 3), randInt(rng, -2, 3), randInt(rng, -2, 3)];
    let d = -(a * M[0] + b * M[1] + c * M[2]);
    for (let i = 0; i < 20 && d === 0; i++) {
      M[0] = randInt(rng, -2, 3);
      M[1] = randInt(rng, -2, 3);
      M[2] = randInt(rng, -2, 3);
      d = -(a * M[0] + b * M[1] + c * M[2]);
    }
    const plane = polyLatex([
      { c: a, v: "x" },
      { c: b, v: "y" },
      { c: c, v: "z" },
      { c: d },
    ]);
    const planeFlip = polyLatex([
      { c: a, v: "x" },
      { c: b, v: "y" },
      { c: c, v: "z" },
      { c: -d },
    ]);
    const planePlus = polyLatex([
      { c: a, v: "x" },
      { c: b, v: "y" },
      { c: c, v: "z" },
      { c: d + 1 },
    ]);
    const planePerm = polyLatex([
      { c: b, v: "x" },
      { c: c, v: "y" },
      { c: a, v: "z" },
      { c: d },
    ]);

    return makeMC({
      template: planeEquation,
      prompt: `Trong không gian $Oxyz$, mặt phẳng $(P)$ đi qua điểm $M${pointLatex(M)}$ và có vectơ pháp tuyến $\\overrightarrow{n}=(${a};${b};${c})$. Phương trình tổng quát của $(P)$ là`,
      correctLatex: `${plane}=0`,
      distractors: [`${planeFlip}=0`, `${planePlus}=0`, `${planePerm}=0`],
      params: { Mx: M[0], My: M[1], Mz: M[2], a, b, c, d },
      solution: [
        `Mặt phẳng đi qua $M${pointLatex(M)}$ và có VTPT $\\overrightarrow{n}=(${a};${b};${c})$ có phương trình: $${a}(x-${M[0]})+${b}(y-${M[1]})+${c}(z-${M[2]})=0$.`,
        `Khai triển: $${plane}=0$.`,
      ],
    });
  },
);

/** Màn 6 – mẫu 3: khoảng cách từ điểm đến mặt phẳng (trả lời ngắn). */
const pointPlaneDistance: QuestionTemplate = defineTemplate(
  { id: "l6-point-plane", level: 6, topic: TOPIC, title: "Khoảng cách từ điểm đến mặt phẳng" },
  (rng = Math.random): GeneratedQuestion => {
    const triple = pickOne(rng, PYTHAGOREAN_3D);
    const n = shuffle(rng, triple.d) as [number, number, number];
    const P: [number, number, number] = [randInt(rng, -3, 3), randInt(rng, -3, 3), randInt(rng, -3, 3)];
    const k = randInt(rng, 1, 4);
    const sign = rng() < 0.5 ? -1 : 1;
    const d = -(n[0] * P[0] + n[1] * P[1] + n[2] * P[2]) + sign * k * triple.length;
    const plane = polyLatex([
      { c: n[0], v: "x" },
      { c: n[1], v: "y" },
      { c: n[2], v: "z" },
      { c: d },
    ]);

    return {
      kind: "short",
      templateId: pointPlaneDistance.id,
      level: 6,
      topic: TOPIC,
      title: pointPlaneDistance.title,
      prompt: `Trong không gian $Oxyz$, cho điểm $M${pointLatex(P)}$ và mặt phẳng $(\\alpha): ${plane}=0$. Tính khoảng cách từ $M$ đến $(\\alpha)$.`,
      answerLatex: String(k),
      answerValue: k,
      tolerance: 0.001,
      params: { Mx: P[0], My: P[1], Mz: P[2], a: n[0], b: n[1], c: n[2], d, k },
      solution: [
        `Khoảng cách $d(M,(\\alpha))=\\dfrac{|ax_0+by_0+cz_0+d|}{\\sqrt{a^2+b^2+c^2}}$.`,
        `Tử số: $|${n[0]}\\cdot(${P[0]})+${n[1]}\\cdot(${P[1]})+${n[2]}\\cdot(${P[2]})${d >= 0 ? "+" : "-"}${Math.abs(d)}|=${Math.abs(n[0] * P[0] + n[1] * P[1] + n[2] * P[2] + d)}$.`,
        `Mẫu số: $\\sqrt{${n[0] ** 2}+${n[1] ** 2}+${n[2] ** 2}}=\\sqrt{${triple.length ** 2}}=${triple.length}$. Vậy khoảng cách bằng $${k}$.`,
      ],
    };
  },
);

/** Màn 6 – mẫu 4: điểm thuộc đường thẳng. */
const pointOnLine: QuestionTemplate = defineTemplate(
  { id: "l6-line-point", level: 6, topic: TOPIC, title: "Điểm thuộc đường thẳng" },
  (rng = Math.random): GeneratedQuestion => {
    const A: [number, number, number] = [randInt(rng, -2, 3), randInt(rng, -2, 3), randInt(rng, -2, 3)];
    const add = (p: [number, number, number], v: [number, number, number], t: number): [number, number, number] => [
      p[0] + t * v[0],
      p[1] + t * v[1],
      p[2] + t * v[2],
    ];
    let u: [number, number, number] = [1, 1, 1];
    let correct: [number, number, number] = add(A, u, 2);
    let candidates: Array<[number, number, number]> = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      u = [randInt(rng, -3, 3), randInt(rng, -3, 3), randInt(rng, -3, 3)];
      if (u[0] === 0 || u[1] === 0 || u[2] === 0) u = [1, 1, 1];
      const flipped: [number, number, number] = [-u[0], u[1], u[2]];
      const permuted: [number, number, number] = [u[1], u[2], u[0]];
      correct = add(A, u, 2);
      candidates = [add(A, flipped, 2), add(A, permuted, 2), A];
      const keys = new Set([pointLatex(correct), ...candidates.map(pointLatex)]);
      if (keys.size === 4) break;
    }

    return makeMC({
      template: pointOnLine,
      prompt: `Trong không gian $Oxyz$, cho điểm $A${pointLatex(A)}$ và vectơ $\\overrightarrow{u}=(${u[0]};${u[1]};${u[2]})$. Đường thẳng $\\Delta$ đi qua $A$ và có vectơ chỉ phương $\\overrightarrow{u}$. Điểm nào sau đây thuộc $\\Delta$?`,
      correctLatex: pointLatex(correct),
      distractors: candidates.map(pointLatex),
      params: { Ax: A[0], Ay: A[1], Az: A[2], ux: u[0], uy: u[1], uz: u[2] },
      solution: [
        `Phương trình tham số của $\\Delta$: $\\begin{cases}x=${A[0]}${u[0] >= 0 ? "+" : ""}${u[0]}t\\\\ y=${A[1]}${u[1] >= 0 ? "+" : ""}${u[1]}t\\\\ z=${A[2]}${u[2] >= 0 ? "+" : ""}${u[2]}t\\end{cases}$.`,
        `Chọn $t=2$: $x=${correct[0]}$, $y=${correct[1]}$, $z=${correct[2]}$.`,
        `Vậy điểm $${pointLatex(correct)}$ thuộc $\\Delta$.`,
      ],
    });
  },
);

export const level6Templates: QuestionTemplate[] = [
  distanceBetweenPoints,
  planeEquation,
  pointPlaneDistance,
  pointOnLine,
];
