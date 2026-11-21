import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  PAUSE_TIMER_ON_EXPLANATION,
  QUESTIONS_PER_RUN,
  afterCorrectAction,
  afterWrongAction,
  drawQuestions,
  findSimilar,
  formatClock,
  loseHeadline,
  prepareQuestion,
  prepareRun,
  remainingFromDeadline,
  resultLabel,
  runOutcome,
  shuffle,
  timeoutDuringExplanation,
} from "../src/game/engine.js";

const level1 = JSON.parse(readFileSync(new URL("../public/data/level1.json", import.meta.url), "utf8"));
const level2 = JSON.parse(readFileSync(new URL("../public/data/level2.json", import.meta.url), "utf8"));
const bank = [...level1, ...level2].filter((question) => question.level === 1);
const bank2 = level2;

function seeded(seed = 123456789) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

test("shuffle không sửa mảng gốc và giữ nguyên phần tử", () => {
  const input = [1, 2, 3, 4, 5];
  const output = shuffle(input, seeded(7));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);
  assert.deepEqual(output.slice().sort((a, b) => a - b), [1, 2, 3, 4, 5]);
});

test("prepareRun rút đúng 5 câu gốc, không lấy câu tương tự", () => {
  const run = prepareRun(bank, seeded(11));
  assert.equal(run.length, QUESTIONS_PER_RUN);
  assert.equal(new Set(run.map((question) => question.id)).size, QUESTIONS_PER_RUN);
  assert.equal(run.every((question) => !question.isSimilar), true);
});

test("prepareRun màn 2 cũng đủ 5 câu gốc", () => {
  const run = prepareRun(bank2, seeded(99));
  assert.equal(run.length, 5);
  assert.equal(run.every((question) => !question.isSimilar), true);
});

test("prepareQuestion giữ đúng tập đáp án và đáp án đúng", () => {
  const original = bank.find((question) => question.id === "m1-q04");
  const prepared = prepareQuestion(original, seeded(3));
  assert.deepEqual(prepared.options.slice().sort(), original.options.slice().sort());
  assert.equal(prepared.options[prepared.correctIndex], original.options[original.correct]);
  assert.equal(prepared.id, original.id);
});

test("prepareQuestion từ chối câu không đủ 4 đáp án", () => {
  assert.throws(() => prepareQuestion({ ...bank[0], options: ["a", "b", "c"] }), /4 đáp án/);
});

test("drawQuestions báo lỗi khi thiếu câu gốc", () => {
  assert.throws(() => drawQuestions(bank.slice(0, 4)), /ít nhất 5 câu gốc/);
});

test("findSimilar trả về đúng câu tương tự", () => {
  const original = bank.find((question) => question.id === "m1-q04");
  const similar = findSimilar(bank, original.similarId);
  assert.ok(similar);
  assert.equal(similar.id, "m1-q04s");
  assert.equal(findSimilar(bank, "m1-q01"), null);
  assert.equal(findSimilar(bank, "không-tồn-tại"), null);
  assert.equal(findSimilar(bank2, "m1-q04s"), null);
});

test("màn 1: câu 1-3 sai thì sang câu kế, không có bước tương tự", () => {
  for (const id of ["m1-q01", "m1-q02", "m1-q03"]) {
    const question = level1.find((item) => item.id === id);
    assert.ok(question, `${id}: không tìm thấy câu`);
    assert.equal(question.similarId, undefined, `${id}: không được có câu tương tự`);
    assert.equal(
      afterWrongAction({ lives: 1, isSimilarActive: false, hasSimilar: false, isLastQuestion: false }),
      "advance",
    );
  }
});

test("formatClock hiển thị m:ss", () => {
  assert.equal(formatClock(0), "00:00");
  assert.equal(formatClock(1), "00:01");
  assert.equal(formatClock(59_000), "00:59");
  assert.equal(formatClock(60_000), "01:00");
  assert.equal(formatClock(300_000), "05:00");
  assert.equal(formatClock(-5), "00:00");
});

test("remainingFromDeadline không trả số âm", () => {
  assert.equal(remainingFromDeadline(10_000, 4_000), 6_000);
  assert.equal(remainingFromDeadline(10_000, 12_000), 0);
});

test("thông điệp thua đúng nhân vật", () => {
  assert.equal(loseHeadline("prince"), "Chưa học mà đòi giải cứu công chúa");
  assert.equal(loseHeadline("princess"), "Chưa học mà đòi giải cứu hoàng tử");
});

test("nhãn kết quả", () => {
  assert.equal(resultLabel("win"), "Thắng");
  assert.equal(resultLabel("lose_lives"), "Hết mạng");
  assert.equal(resultLabel("lose_timeout"), "Hết giờ");
  assert.equal(resultLabel("abandoned"), "Bỏ dở");
});

test("sai lần thứ hai là thua", () => {
  let lives = 2;
  lives -= 1;
  assert.equal(
    afterWrongAction({ lives, isSimilarActive: false, hasSimilar: true, isLastQuestion: false }),
    "similar",
  );
  lives -= 1;
  assert.equal(
    afterWrongAction({ lives, isSimilarActive: true, hasSimilar: false, isLastQuestion: false }),
    "finish_lose",
  );
  assert.equal(runOutcome({ lives, completed: false, timedOut: false }), "lose_lives");
});

test("màn 1: câu tương tự đúng thì đi tiếp, không mất thêm mạng", () => {
  const lives = 1;
  assert.equal(
    afterWrongAction({ lives, isSimilarActive: false, hasSimilar: true, isLastQuestion: false }),
    "similar",
  );
  assert.equal(afterCorrectAction({ isLastQuestion: false }), "advance");
  assert.equal(lives, 1);
});

test("màn 2: sai câu gốc thì sang câu kế, không có bước tương tự", () => {
  assert.equal(
    afterWrongAction({ lives: 1, isSimilarActive: false, hasSimilar: false, isLastQuestion: false }),
    "advance",
  );
});

test("câu cuối: hoàn thành 5 câu và còn mạng là thắng", () => {
  assert.equal(afterCorrectAction({ isLastQuestion: true }), "win");
  assert.equal(
    afterWrongAction({ lives: 1, isSimilarActive: false, hasSimilar: false, isLastQuestion: true }),
    "win",
  );
  assert.equal(
    afterWrongAction({ lives: 1, isSimilarActive: true, hasSimilar: false, isLastQuestion: true }),
    "win",
  );
  assert.equal(runOutcome({ lives: 1, completed: true, timedOut: false }), "win");
});

test("hết giờ là thua; PAUSE_TIMER=false thì hết giờ ngay cả khi xem lời giải", () => {
  assert.equal(PAUSE_TIMER_ON_EXPLANATION, true);
  assert.equal(timeoutDuringExplanation({ expired: true, pauseOnExplanation: true, showingExplanation: true }), null);
  assert.equal(
    timeoutDuringExplanation({ expired: true, pauseOnExplanation: false, showingExplanation: true }),
    "lose_timeout",
  );
  assert.equal(
    timeoutDuringExplanation({ expired: true, pauseOnExplanation: true, showingExplanation: false }),
    "lose_timeout",
  );
  assert.equal(timeoutDuringExplanation({ expired: false, pauseOnExplanation: false, showingExplanation: true }), null);
  assert.equal(runOutcome({ lives: 2, completed: false, timedOut: true }), "lose_timeout");
});
