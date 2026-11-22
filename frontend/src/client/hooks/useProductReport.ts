import { useMutation } from '@tanstack/react-query'
import { reportProduct } from '../services/productReportService'

export const useReportProduct = (id: number) =>
  useMutation({ mutationFn: (body: { reason: string; detail?: string }) => reportProduct(id, body) })
