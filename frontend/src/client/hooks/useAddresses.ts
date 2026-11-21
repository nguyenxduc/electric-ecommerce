import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../services/addressService'

const KEY = ['addresses']

export const useAddresses = () =>
  useQuery({
    queryKey: KEY,
    queryFn: getAddresses,
    enabled: !!localStorage.getItem('accessToken'),
    staleTime: 5 * 60 * 1000
  })

// Moi thao tac ghi deu lam moi danh sach (thu tu mac dinh co the doi)
const useAddressMutation = <A, R>(fn: (a: A) => Promise<R>) => {
  const qc = useQueryClient()
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries({ queryKey: KEY }) })
}

export const useCreateAddress = () => useAddressMutation(createAddress)
export const useUpdateAddress = () => useAddressMutation(updateAddress)
export const useDeleteAddress = () => useAddressMutation(deleteAddress)
export const useSetDefaultAddress = () => useAddressMutation(setDefaultAddress)
