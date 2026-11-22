import axiosClient from '../../lib/axios'

export const REPORT_REASONS = [
  { value: 'counterfeit', label: 'Counterfeit / fake product' },
  { value: 'prohibited', label: 'Prohibited item' },
  { value: 'misleading', label: 'Misleading description or price' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Other' }
] as const

export const reportProduct = async (id: number, body: { reason: string; detail?: string }) =>
  (await axiosClient.post(`/products/${id}/report`, body)).data
