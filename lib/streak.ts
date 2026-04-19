/**
 * Daily Streak — lưu bằng localStorage (zero-cost, no server needed).
 *
 * Cấu trúc dữ liệu trong localStorage key "dace_streak":
 * {
 *   count:    number,   // số ngày liên tiếp
 *   lastDate: string,   // "YYYY-MM-DD" ngày ôn tập gần nhất
 *   best:     number    // kỷ lục streak
 * }
 */

const KEY = 'dace_streak'

interface StreakData {
  count:    number
  lastDate: string
  best:     number
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function read(): StreakData {
  if (typeof window === 'undefined') return { count: 0, lastDate: '', best: 0 }
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : { count: 0, lastDate: '', best: 0 }
  } catch {
    return { count: 0, lastDate: '', best: 0 }
  }
}

function write(data: StreakData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

/**
 * Gọi sau khi user hoàn thành ít nhất 1 lượt ôn trong ngày.
 * Tự động tính streak:
 *  - Cùng ngày hôm nay → không thay đổi
 *  - Ngày liên tiếp   → tăng +1
 *  - Bỏ ngày          → reset về 1
 */
export function recordStudyToday(): StreakData {
  const data  = read()
  const today = todayStr()

  if (data.lastDate === today) return data  // đã ghi nhận hôm nay

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yStr = yesterday.toISOString().slice(0, 10)

  const newCount = data.lastDate === yStr ? data.count + 1 : 1
  const updated: StreakData = {
    count:    newCount,
    lastDate: today,
    best:     Math.max(data.best, newCount),
  }
  write(updated)
  return updated
}

/**
 * Đọc streak hiện tại (không ghi gì thêm).
 * Nếu hôm nay chưa ôn, streak vẫn giữ nguyên (chưa bị reset).
 */
export function getStreak(): StreakData {
  return read()
}

/**
 * Trả về true nếu hôm nay đã ôn ít nhất 1 câu.
 */
export function studiedToday(): boolean {
  return read().lastDate === todayStr()
}
