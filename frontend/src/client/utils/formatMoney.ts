/** Store catalog, checkout, and loyalty use USD. */
export const STORE_CURRENCY = 'USD'

export const formatUsd = (
  value: number | string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  const formatted = n.toLocaleString('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2
  })
  return `$${formatted}`
}
