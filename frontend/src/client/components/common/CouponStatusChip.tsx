// Chip trang thai voucher cho trang seller va admin (status do backend tinh)
const STYLES: Record<string, { label: string; cls: string }> = {
  active: { label: 'Active', cls: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', cls: 'bg-blue-100 text-blue-700' },
  paused: { label: 'Paused', cls: 'bg-amber-100 text-amber-700' },
  expired: { label: 'Expired', cls: 'bg-gray-200 text-gray-600' },
  used_up: { label: 'Used up', cls: 'bg-red-100 text-red-700' }
}

export default function CouponStatusChip({ status }: { status?: string }) {
  const s = STYLES[status ?? ''] ?? STYLES.active
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  )
}
