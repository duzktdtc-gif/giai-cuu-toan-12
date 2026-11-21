import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const level1 = JSON.parse(readFileSync(new URL("../public/data/level1.json", import.meta.url), "utf8"));
const level2 = JSON.parse(readFileSync(new URL("../public/data/level2.json", import.meta.url), "utf8"));
const banks = [level1, level2];

function vertexOk(label) {
  return /^[A-D]'?$/.test(label);
}

function checkFigure(question) {
  if (!question.figure) return;
  if (question.figure.type === "cube") {
    for (const pair of [...(question.figure.highlight ?? []), ...(question.figure.dashedEdges ?? [])]) {
      assert.match(pair, /^[A-D]'?[A-D]'?$/, `${question.id}: highlight ${pair} không hợp lệ`);
      const match = pair.match(/^([A-D]'?)([A-D]'?)$/);
      const left = match[1];
      const right = match[2];
      assert.ok(vertexOk(left) && vertexOk(right), `${question.id}: đỉnh ${pair} không hợp lệ`);
      assert.notEqual(left, right, `${question.id}: highlight ${pair} nối một đỉnh với chính nó`);
    }
  } else {
    assert.ok(
      ["angle", "parallel", "coincident", "perpendicular", "skew", "three"].includes(question.figure.mode),
      `${question.id}: mode hình không hợp lệ`,
    );
  }
}

test("đếm đúng số câu gốc / câu tương tự", () => {
  const l1Original = level1.filter((question) => !question.isSimilar);
  const l1Similar = level1.filter((question) => question.isSimilar);
  const l2Original = level2.filter((question) => !question.isSimilar);
  const l2Similar = level2.filter((question) => question.isSimilar);

  assert.equal(l1Original.length, 5);
  assert.equal(l1Similar.length, 2);
  assert.equal(l2Original.length, 5);
  assert.equal(l2Similar.length, 0);
});

test("màn 1: câu 1-3 không có hình và không có câu tương tự", () => {
  for (const id of ["m1-q01", "m1-q02", "m1-q03"]) {
    const question = level1.find((item) => item.id === id);
    assert.ok(question, `${id}: không tìm thấy câu`);
    assert.equal(question.figure, undefined, `${id}: không được có hình`);
    assert.equal(question.similarId, undefined, `${id}: không được có câu tương tự`);
  }
});

test("mỗi câu có đúng 4 đáp án khác nhau và một đáp án đúng", () => {
  for (const bank of banks) {
    for (const question of bank) {
      assert.equal(question.options.length, 4, `${question.id}: phải có 4 đáp án`);
      const normalized = question.options.map((option) => option.trim().toLowerCase());
      assert.equal(new Set(normalized).size, 4, `${question.id}: đáp án bị trùng`);
      assert.ok(Number.isInteger(question.correct), `${question.id}: correct phải là số nguyên`);
      assert.ok(question.correct >= 0 && question.correct <= 3, `${question.id}: correct ngoài 0..3`);
      assert.ok(Array.isArray(question.solution) && question.solution.length > 0, `${question.id}: thiếu lời giải`);
      assert.ok(question.stem.trim().length > 20, `${question.id}: đề bài quá ngắn`);
      assert.ok(question.topic.trim().length > 0, `${question.id}: thiếu topic`);
      checkFigure(question);
    }
  }
});

test("answerStatus và solutionStatus chỉ nhận draft hoặc reviewed", () => {
  const allowed = new Set(["draft", "reviewed"]);
  for (const bank of banks) {
    for (const question of bank) {
      assert.ok(allowed.has(question.answerStatus), `${question.id}: answerStatus không hợp lệ`);
      assert.ok(allowed.has(question.solutionStatus), `${question.id}: solutionStatus không hợp lệ`);
    }
  }
});

test("câu tương tự trỏ đúng và không dùng làm câu gốc", () => {
  for (const bank of banks) {
    const byId = new Map(bank.map((question) => [question.id, question]));
    for (const question of bank) {
      if (question.similarId) {
        const similar = byId.get(question.similarId);
        assert.ok(similar, `${question.id}: similarId không tồn tại`);
        assert.equal(similar.isSimilar, true, `${question.id}: similarId phải trỏ tới câu tương tự`);
        assert.equal(similar.level, question.level, `${question.id}: câu tương tự khác màn`);
        assert.equal(similar.similarId, undefined, `${question.id}: câu tương tự không được có similarId`);
      }
    }
  }
  const l1WithSimilar = level1
    .filter((question) => !question.isSimilar && question.similarId)
    .map((question) => question.id)
    .sort();
  assert.deepEqual(l1WithSimilar, ["m1-q04", "m1-q05"], "chỉ câu 4 và câu 5 có câu tương tự");
  assert.equal(level2.every((question) => !question.similarId), true, "màn 2 không có câu tương tự");
});

test("không còn mã LaTeX soạn đề / đáp án kiểu 'Chọn A'", () => {
  const forbidden = ["\\begin{enumerate}", "\\end{enumerate}", "\\item", "\\noindent", "\\textbf", "\\vspace", "\\end{center}", "Chọn A", "Chọn B", "Chọn C", "Chọn D"];
  for (const bank of banks) {
    for (const question of bank) {
      const text = [question.stem, ...question.options, ...question.solution].join("\n");
      for (const marker of forbidden) {
        assert.equal(text.includes(marker), false, `${question.id}: còn sót "${marker}"`);
      }
    }
  }
});

test("mã câu không trùng trong từng màn", () => {
  for (const bank of banks) {
    const ids = bank.map((question) => question.id);
    assert.equal(new Set(ids).size, ids.length);
  }
});

test("màn 1 có đủ lời giải cho cả câu gốc và câu tương tự", () => {
  for (const question of level1) {
    assert.ok(question.solution.length > 0, `${question.id}: màn 1 bắt buộc có lời giải`);
  }
});
