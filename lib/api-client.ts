// ─── Frontend API client — unwraps { statusCode, message, data, errors } ──────
// Dùng thay vì gọi res.json() trực tiếp để tương thích với JSON contract mới.

import type { ApiResponse } from './api-response'

/**
 * Wrapper quanh fetch: tự động unwrap `response.data`.
 * Khi lỗi (res.ok = false), throw Error với `response.message`.
 *
 * @example
 * const topics = await apiFetch<TopicWithCount[]>('/api/topics')
 * const phrase = await apiFetch<Phrase>('/api/phrases', { method: 'POST', body: ... })
 */
export async function apiFetch<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, init)
  const body: ApiResponse<T> = await res.json()

  if (!res.ok) {
    throw new Error(body.message ?? `HTTP ${res.status}`)
  }

  return body.data as T
}
