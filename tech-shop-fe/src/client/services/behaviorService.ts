import axiosClient from '../../lib/axios'

export type BehaviorEventType =
  | 'view'
  | 'click'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'wishlist_add'
  | 'wishlist_remove'
  | 'search'

export type BehaviorEvent = {
  event_type: BehaviorEventType
  product_id?: string | number | null
  metadata?: Record<string, unknown>
}

export function getOrCreateSessionId(): string {
  const key = 'analytics_session_id'
  let sid = localStorage.getItem(key)
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key, sid)
  }
  return sid
}

const FLUSH_MS = 3500
const MAX_QUEUE = 30
let queue: BehaviorEvent[] = []
let flushTimer: ReturnType<typeof setTimeout> | null = null

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    flushBehaviorQueue()
  }, FLUSH_MS)
}

export function flushBehaviorQueue() {
  if (queue.length === 0) return Promise.resolve()
  const batch = queue
  queue = []
  const session_id = getOrCreateSessionId()
  return axiosClient
    .post('/behavior/events', { session_id, events: batch })
    .then(() => undefined)
}

/** Ghi nhận hành vi (queue chung, gửi theo lô). */
export function trackBehavior(
  event_type: BehaviorEventType,
  product_id?: string | number | null,
  metadata?: Record<string, unknown>
) {
  queue.push({
    event_type,
    product_id: product_id ?? undefined,
    metadata
  })
  if (queue.length >= MAX_QUEUE) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    return flushBehaviorQueue()
  }
  scheduleFlush()
  return Promise.resolve()
}

export async function sendBehaviorBatch(events: BehaviorEvent[]) {
  if (events.length === 0) return
  const session_id = getOrCreateSessionId()
  await axiosClient.post('/behavior/events', {
    session_id,
    events
  })
}
