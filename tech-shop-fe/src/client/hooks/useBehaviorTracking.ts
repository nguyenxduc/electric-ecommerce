import { useEffect } from 'react'
import { flushBehaviorQueue, trackBehavior } from '../services/behaviorService'
import type { BehaviorEventType } from '../services/behaviorService'

/** Hook mỏng: flush khi rời trang + re-export trackBehavior */
export function useBehaviorTracking() {
  useEffect(() => {
    const onLeave = () => {
      flushBehaviorQueue().catch(() => {})
    }
    window.addEventListener('beforeunload', onLeave)
    return () => {
      window.removeEventListener('beforeunload', onLeave)
      onLeave()
    }
  }, [])

  return {
    track: (
      event_type: BehaviorEventType,
      product_id?: string | number | null,
      metadata?: Record<string, unknown>
    ) => trackBehavior(event_type, product_id, metadata)
  }
}
