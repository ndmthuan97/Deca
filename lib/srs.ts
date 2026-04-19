/**
 * SM-2 Spaced Repetition Algorithm
 * Tham chiếu: https://www.supermemo.com/en/blog/application-of-a-computer-to-improve-the-results-obtained-in-working-with-the-supermemo-method
 */

export type ReviewResult = 'again' | 'hard' | 'good' | 'easy'

// Mapping kết quả → điểm chất lượng (0–5)
const QUALITY: Record<ReviewResult, number> = {
  again: 0, // Hoàn toàn quên
  hard:  2, // Sai nhưng khi xem đáp án thấy quen
  good:  4, // Đúng sau một chút suy nghĩ
  easy:  5, // Đúng ngay, rất tự nhiên
}

export interface SRSState {
  easeFactor:     number // EF: 1.3 – 2.5
  reviewInterval: number // Số ngày tới lần ôn kế tiếp
  repetitions:    number // Số lần liên tiếp trả lời đúng
  nextReviewAt:   Date
}

/**
 * Tính trạng thái SRS mới sau một lần ôn.
 * @param current  Trạng thái hiện tại
 * @param result   Kết quả người dùng đánh giá
 * @returns        Trạng thái mới
 */
export function calculateNextReview(
  current: Pick<SRSState, 'easeFactor' | 'reviewInterval' | 'repetitions'>,
  result: ReviewResult
): SRSState {
  const q = QUALITY[result]
  let { easeFactor, reviewInterval, repetitions } = current

  if (q < 3) {
    // Thất bại → reset về đầu
    repetitions    = 0
    reviewInterval = 1
    // EF giảm 0.2, không xuống dưới 1.3
    easeFactor = Math.max(1.3, easeFactor - 0.2)
  } else {
    // Thành công → tăng dần interval
    repetitions += 1
    if (repetitions === 1)      reviewInterval = 1
    else if (repetitions === 2) reviewInterval = 6
    else                        reviewInterval = Math.round(reviewInterval * easeFactor)

    // Cập nhật EF theo công thức SM-2
    easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    easeFactor = Math.max(1.3, Math.min(2.5, easeFactor))
  }

  const nextReviewAt = new Date()
  nextReviewAt.setDate(nextReviewAt.getDate() + reviewInterval)
  // Chuẩn hóa về đầu ngày hôm đó (midnight UTC) để tránh drift
  nextReviewAt.setHours(0, 0, 0, 0)

  return { easeFactor, reviewInterval, repetitions, nextReviewAt }
}

/**
 * Kiểm tra một phrase có đến hạn ôn tập chưa.
 */
export function isDue(nextReviewAt: Date | string | null): boolean {
  if (!nextReviewAt) return true
  return new Date(nextReviewAt) <= new Date()
}
