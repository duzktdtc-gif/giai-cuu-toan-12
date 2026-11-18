export const REVIEW_STATUSES = Object.freeze(["draft", "reviewed"]);

/**
 * Một câu cần duyệt nếu đáp án hoặc lời giải còn ở trạng thái draft.
 * @param {{ answerStatus: string, solutionStatus: string }} question
 */
export function questionNeedsReview(question) {
  return question.answerStatus === "draft" || question.solutionStatus === "draft";
}

/**
 * Đếm số câu còn draft trong một hoặc nhiều ngân hàng câu hỏi.
 * @param {Array<Array<{ answerStatus: string, solutionStatus: string }>>} banks
 */
export function countDraftQuestions(banks) {
  let count = 0;
  for (const bank of banks) {
    for (const question of bank) {
      if (questionNeedsReview(question)) count += 1;
    }
  }
  return count;
}

/**
 * Cảnh báo chỉ hiện khi còn ít nhất một câu draft.
 * @param {Array<Array<{ answerStatus: string, solutionStatus: string }>>} banks
 */
export function reviewWarningVisible(banks) {
  return countDraftQuestions(banks) > 0;
}
