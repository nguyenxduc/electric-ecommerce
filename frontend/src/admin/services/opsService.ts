import axiosClient from '../../lib/axios'

export const fmtVnd = (n: number | string | null | undefined) =>
  `${Number(n ?? 0).toLocaleString('en-US')} VND`

export const errMsg = (e: any, fallback: string) =>
  e?.response?.data?.error || e?.response?.data?.message || fallback

export const fetchCodPending = async (carrier?: string) =>
  (await axiosClient.get('/shipments/cod/pending', { params: { carrier: carrier || undefined } })).data.data
export const createCodSettlement = async (body: {
  carrier: string
  shipment_ids: number[]
  received_amount_vnd: number
  reference?: string
  note?: string
}) => (await axiosClient.post('/shipments/cod/settlements', body)).data.data
export const fetchCodSettlements = async (carrier?: string) =>
  (await axiosClient.get('/shipments/cod/settlements', { params: { carrier: carrier || undefined, limit: 50 } })).data.data

export const fetchFraudStats = async () => (await axiosClient.get('/fraud/stats')).data.data
export const fetchFraudFlags = async (params: Record<string, any>) =>
  (await axiosClient.get('/fraud/flags', { params })).data
export const resolveFraudFlag = async (id: number | string, status: 'confirmed' | 'dismissed') =>
  (await axiosClient.patch(`/fraud/flags/${id}`, { status })).data

export const fetchTaxReport = async (period: string) =>
  (await axiosClient.get('/tax/report', { params: { period } })).data.data
export const fetchInvoices = async (params: Record<string, any>) =>
  (await axiosClient.get('/invoices', { params })).data.data

export const downloadTaxCsv = async (period: string) => {
  const { data } = await axiosClient.get('/tax/report.csv', { params: { period }, responseType: 'blob' })
  const url = URL.createObjectURL(data as Blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tax-report-${period}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export const openInvoiceHtml = async (id: number | string) => {
  const { data } = await axiosClient.get(`/invoices/${id}/html`, { responseType: 'text' })
  window.open(URL.createObjectURL(new Blob([data], { type: 'text/html' })), '_blank')
}
