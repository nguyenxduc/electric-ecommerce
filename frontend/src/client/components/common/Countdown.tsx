import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'

const pad = (n: number) => String(n).padStart(2, '0')

// Dem nguoc toi endsAt, cap nhat moi giay. Khi ve 0 thi lam moi du lieu flash sale
// (danh sach + chi tiet san pham) de gia tro ve binh thuong.
const Countdown = ({ endsAt, className = '' }: { endsAt: string; className?: string }) => {
  const queryClient = useQueryClient()
  const end = new Date(endsAt).getTime()
  const [left, setLeft] = useState(() => Math.max(0, end - Date.now()))
  const fired = useRef(false)

  useEffect(() => {
    fired.current = false
    const tick = () => {
      const ms = Math.max(0, end - Date.now())
      setLeft(ms)
      if (ms === 0 && !fired.current) {
        fired.current = true
        queryClient.invalidateQueries({ queryKey: ['flashSale'] })
        queryClient.invalidateQueries({ queryKey: ['product'] })
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [end, queryClient])

  const s = Math.floor(left / 1000)
  const days = Math.floor(s / 86400)
  return (
    <span data-testid="flash-countdown" className={`font-mono tabular-nums ${className}`}>
      {days > 0 && `${days}d `}
      {pad(Math.floor((s % 86400) / 3600))}:{pad(Math.floor((s % 3600) / 60))}:{pad(s % 60)}
    </span>
  )
}

export default Countdown
