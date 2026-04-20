/**
 * Browser Notification utilities for Dace review reminders.
 * Uses the Web Notifications API — no service worker needed for simple alerts.
 */

const ALARM_KEY = 'dace:notify-alarm'

export type NotifPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export function getPermission(): NotifPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestPermission(): Promise<NotifPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  const result = await Notification.requestPermission()
  return result
}

export function sendNotification(title: string, body: string, icon = '/favicon.ico') {
  if (typeof window === 'undefined') return
  if (Notification.permission !== 'granted') return
  const n = new Notification(title, { body, icon, badge: icon })
  n.onclick = () => { window.focus(); n.close() }
}

/**
 * Schedule a daily review reminder using setTimeout chained with setInterval.
 * Stores the timer ID in localStorage so we can cancel it.
 * Call this once on app boot (in a top-level client component).
 */
export function scheduleDailyReminder(hour: number) {
  if (typeof window === 'undefined') return
  clearDailyReminder()

  function msUntilHour(h: number): number {
    const now  = new Date()
    const next = new Date(now)
    next.setHours(h, 0, 0, 0)
    if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
    return next.getTime() - now.getTime()
  }

  const delay = msUntilHour(hour)

  const tid = window.setTimeout(() => {
    sendNotification(
      '🧠 Đến giờ ôn tập!',
      'Bạn có câu cần ôn hôm nay. Dành 5 phút để giữ chuỗi streak!',
    )
    // Re-schedule every 24h
    const itid = window.setInterval(() => {
      sendNotification(
        '🧠 Đến giờ ôn tập!',
        'Bạn có câu cần ôn hôm nay. Dành 5 phút để giữ chuỗi streak!',
      )
    }, 24 * 60 * 60 * 1000)
    localStorage.setItem(ALARM_KEY, `interval:${itid}`)
  }, delay)

  localStorage.setItem(ALARM_KEY, `timeout:${tid}`)
}

export function clearDailyReminder() {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem(ALARM_KEY)
  if (!raw) return
  const [type, idStr] = raw.split(':')
  const id = parseInt(idStr, 10)
  if (type === 'timeout')  window.clearTimeout(id)
  if (type === 'interval') window.clearInterval(id)
  localStorage.removeItem(ALARM_KEY)
}
