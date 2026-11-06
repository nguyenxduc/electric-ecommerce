// Mot dinh dang ngay cho ca trang admin (giong Audit Log): "06 Nov 2026" / "06 Nov 2026, 18:33"
const DATE: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }
const TIME: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }

type DateInput = string | number | Date | null | undefined

export const fmtDate = (d: DateInput) => (d ? new Date(d).toLocaleDateString('en-GB', DATE) : '-')
export const fmtDateTime = (d: DateInput) =>
  d ? new Date(d).toLocaleString('en-GB', { ...DATE, ...TIME }) : '-'
