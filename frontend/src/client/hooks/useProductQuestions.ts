import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  askProductQuestion,
  deleteProductQuestion,
  getProductQuestions
} from '../services/productQuestionService'

export const useProductQuestions = (productId: number, page: number) =>
  useQuery({
    queryKey: ['product-questions', productId, page],
    queryFn: () => getProductQuestions(productId, page),
    placeholderData: keepPreviousData
  })

export const useAskQuestion = (productId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (question: string) => askProductQuestion(productId, question),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-questions', productId] })
  })
}

export const useDeleteQuestion = (productId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteProductQuestion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product-questions', productId] })
  })
}
