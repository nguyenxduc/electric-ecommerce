import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { dismissProductReports, fetchProductReports, resolveProductReports } from '../services/productReportService'

export const useProductReports = (params: { status: string; page: number; limit: number }) =>
  useQuery({ queryKey: ['admin', 'product-reports', params], queryFn: () => fetchProductReports(params) })

// Xu ly xong thi lam moi danh sach, to-do va danh sach san pham (trang thai takedown)
export const useProductReportActions = () => {
  const qc = useQueryClient()
  const onSuccess = () => {
    qc.invalidateQueries({ queryKey: ['admin'] })
  }
  return {
    resolve: useMutation({
      mutationFn: (v: { productId: number; reason: string }) => resolveProductReports(v.productId, v.reason),
      onSuccess
    }),
    dismiss: useMutation({ mutationFn: (productId: number) => dismissProductReports(productId), onSuccess })
  }
}
