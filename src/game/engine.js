/**
 * Logic thuần của game, không phụ thuộc React/DOM.
 * Chạy được bằng Node để test bằng `node --test`.
 *
 * @typedef {import("./types").BankQuestion} BankQuestion
 * @typedef {import("./types").PreparedQuestion} PreparedQuestion
 * @typedef {import("./types").RunResult} RunResult
 * @typedef {import("./levels").Avatar} Avatar
 */

export const QUESTIONS_PER_RUN = 5;
export const MAX_LIVES = 2;
export const TIME_LIMIT_MS = 5 * 60 * 1000;
export const PAUSE_TIMER_ON_EXPLANATION = true;

/**
 * Fisher–Yates, không sửa mảng gốc.
 * @template T
 * @param {T[]} items
 * @param {() => number} [rng]
 * @returns {T[]}
 */
export function shuffle(items, rng = Math.random) {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.min(i, Math.max(0, Math.floor(rng() * (i + 1))));
    const tmp = result[i];
    result[i] = result[j];
    result[j] = tmp;
  }
  return result;
}

/**
 * Trộn 4 đáp án và xác định lại vị trí đáp án đúng.
 * @param {BankQuestion} question
 * @param {() => number} [rng]
 * @returns {PreparedQuestion}
 */
export function prepareQuestion(question, rng = Math.random) {
  if (!question || !Array.isArray(question.options) || question.options.length !== 4) {
    throw new Error(`Câu ${question && question.id ? question.id : "(không rõ)"} phải có đúng 4 đáp án.`);
  }
  if (!Number.isInteger(question.correct) || question.correct < 0 || question.correct > 3) {
    throw new Error(`Câu ${question.id} có chỉ số đáp án đúng không hợp lệ.`);
  }
  const order = shuffle(
    question.options.map((_, index) => index),
    rng,
  );
  const options = order.map((index) => question.options[index]);
  const correctIndex = order.indexOf(question.correct);
  if (correctIndex < 0) {
    throw new Error(`Câu ${question.id} không xác định được đáp án đúng sau khi trộn.`);
  }
  return {
    id: question.id,
    level: question.level,
    topic: question.topic,
    stem: question.stem,
    figure: question.figure ?? null,
    options,
    correctIndex,
    solution: Array.isArray(question.solution) ? question.solution : [],
    similarId: question.similarId,
    answerStatus: question.answerStatus,
    solutionStatus: question.solutionStatus,
    isSimilar: question.isSimilar === true,
    note: question.note,
  };
}

/**
 * Rút ngẫu nhiên 5 câu GỐC, không trùng. Câu tương tự không bao giờ được rút.
 * @param {BankQuestion[]} bank
 * @param {() => number} [rng]
 * @returns {BankQuestion[]}
 */
export function drawQuestions(bank, rng = Math.random) {
  const originals = bank.filter((question) => !question.isSimilar);
  if (originals.length < QUESTIONS_PER_RUN) {
    throw new Error(
      `Ngân hàng cần ít nhất ${QUESTIONS_PER_RUN} câu gốc, hiện có ${originals.length}.`,
    );
  }
  return shuffle(originals, rng).slice(0, QUESTIONS_PER_RUN);
}

/**
 * Chuẩn bị một lượt chơi: 5 câu gốc đã trộn đáp án.
 * @param {BankQuestion[]} bank
 * @param {() => number} [rng]
 * @returns {PreparedQuestion[]}
 */
export function prepareRun(bank, rng = Math.random) {
  return drawQuestions(bank, rng).map((question) => prepareQuestion(question, rng));
}

/**
 * Tìm câu tương tự của một câu gốc.
 * @param {BankQuestion[]} bank
 * @param {string | undefined} similarId
 * @returns {BankQuestion | null}
 */
export function findSimilar(bank, similarId) {
  if (!similarId) return null;
  return bank.find((question) => question.id === similarId && question.isSimilar) ?? null;
}

/**
 * Đồng hồ dạng m:ss, luôn làm tròn lên để không hiện 00:00 khi còn dưới 1 giây.
 * @param {number} ms
 * @returns {string}
 */
export function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * @param {number} deadline
 * @param {number} [now]
 * @returns {number}
 */
export function remainingFromDeadline(deadline, now = Date.now()) {
  return Math.max(0, deadline - now);
}

/**
 * Thông điệp thua theo nhân vật.
 * @param {Avatar} avatar
 * @returns {string}
 */
export function loseHeadline(avatar) {
  return avatar === "prince"
    ? "Chưa học mà đòi giải cứu công chúa"
    : "Chưa học mà đòi giải cứu hoàng tử";
}

/**
 * Sau khi trả lời đúng: nếu đã xong câu gốc cuối thì thắng, ngược lại sang câu kế.
 * @param {{ isLastQuestion: boolean }} input
 * @returns {"win" | "advance"}
 */
export function afterCorrectAction(input) {
  return input.isLastQuestion ? "win" : "advance";
}

/**
 * Sau khi trả lời sai và học sinh bấm nút tiếp tục.
 * - Hết mạng -> thua.
 * - Đang ở câu tương tự -> xong câu gốc đó (thắng nếu là câu cuối).
 * - Màn 1 còn câu tương tự -> làm câu tương tự.
 * - Màn 2 hoặc câu không có tương tự -> sang câu kế (thắng nếu là câu cuối).
 * @param {{ lives: number, isSimilarActive: boolean, hasSimilar: boolean, isLastQuestion: boolean }} input
 * @returns {"finish_lose" | "similar" | "win" | "advance"}
 */
export function afterWrongAction(input) {
  if (input.lives <= 0) return "finish_lose";
  if (input.isSimilarActive) return input.isLastQuestion ? "win" : "advance";
  if (input.hasSimilar) return "similar";
  return input.isLastQuestion ? "win" : "advance";
}

/**
 * Kết quả cuối lượt theo thứ tự ưu tiên: hết giờ, hết mạng, hoàn thành.
 * @param {{ lives: number, completed: boolean, timedOut: boolean }} input
 * @returns {RunResult | null}
 */
export function runOutcome(input) {
  if (input.timedOut) return "lose_timeout";
  if (input.lives <= 0) return "lose_lives";
  if (input.completed) return "win";
  return null;
}

/**
 * Hết giờ có làm thua ngay không, tuỳ cấu hình tạm dừng khi xem lời giải.
 * @param {{ expired: boolean, pauseOnExplanation: boolean, showingExplanation: boolean }} input
 * @returns {"lose_timeout" | null}
 */
export function timeoutDuringExplanation(input) {
  if (!input.expired) return null;
  if (input.pauseOnExplanation && input.showingExplanation) return null;
  return "lose_timeout";
}

/**
 * @param {RunResult | "in_progress" | "abandoned" | "victory" | "game_over"} result
 * @returns {string}
 */
export function resultLabel(result) {
  switch (result) {
    case "win":
      return "Thắng";
    case "lose_lives":
      return "Hết mạng";
    case "lose_timeout":
      return "Hết giờ";
    case "abandoned":
      return "Bỏ dở";
    case "victory":
      return "Thắng (dữ liệu cũ)";
    case "game_over":
      return "Hết mạng (dữ liệu cũ)";
    default:
      return "Đang chơi";
  }
}
