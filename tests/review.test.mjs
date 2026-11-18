import test from "node:test";
import assert from "node:assert/strict";
import {
  REVIEW_STATUSES,
  countDraftQuestions,
  questionNeedsReview,
  reviewWarningVisible,
} from "../src/game/review.js";

const reviewed = { answerStatus: "reviewed", solutionStatus: "reviewed" };
const answerDraft = { answerStatus: "draft", solutionStatus: "reviewed" };
const solutionDraft = { answerStatus: "reviewed", solutionStatus: "draft" };
const bothDraft = { answerStatus: "draft", solutionStatus: "draft" };

test("trạng thái duyệt chỉ có draft hoặc reviewed", () => {
  assert.deepEqual([...REVIEW_STATUSES].sort(), ["draft", "reviewed"]);
});

test("chỉ câu còn draft mới cần duyệt", () => {
  assert.equal(questionNeedsReview(reviewed), false);
  assert.equal(questionNeedsReview(answerDraft), true);
  assert.equal(questionNeedsReview(solutionDraft), true);
  assert.equal(questionNeedsReview(bothDraft), true);
});

test("cảnh báo hiện khi còn ít nhất một câu draft", () => {
  assert.equal(reviewWarningVisible([[], []]), false);
  assert.equal(reviewWarningVisible([[reviewed], [reviewed]]), false);
  assert.equal(reviewWarningVisible([[reviewed, answerDraft], [reviewed]]), true);
  assert.equal(reviewWarningVisible([[reviewed], [solutionDraft]]), true);
});

test("đếm đúng số câu draft, không đếm trùng một câu hai lần", () => {
  assert.equal(countDraftQuestions([[reviewed, bothDraft], [answerDraft, solutionDraft]]), 3);
  assert.equal(countDraftQuestions([[reviewed], [reviewed]]), 0);
});
