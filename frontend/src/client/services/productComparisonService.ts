import axiosClient from '../../lib/axios'
import type { AiProductComparison } from '../types/product'

export const fetchAiProductComparison = async (
  ids: number[]
): Promise<AiProductComparison> => {
  const { data } = await axiosClient.post<{
    success: boolean
    data: AiProductComparison
  }>('/products/compare-ai', { ids })
  return data.data
}
