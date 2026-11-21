import axiosClient from '../../lib/axios'

export type Address = {
  id: number
  name: string
  phone: string
  province: string | null
  district: string | null
  ward: string | null
  street: string
  is_default: boolean
}

export type AddressInput = Pick<Address, 'name' | 'phone' | 'street'> &
  Partial<Pick<Address, 'province' | 'district' | 'ward'>>

type One = { success: boolean; data: Address }

export const getAddresses = async (): Promise<Address[]> => {
  const { data } = await axiosClient.get<{ success: boolean; data: Address[] }>('/addresses')
  return data.data
}

export const createAddress = async (body: AddressInput): Promise<Address> =>
  (await axiosClient.post<One>('/addresses', body)).data.data

export const updateAddress = async ({ id, ...body }: AddressInput & { id: number }): Promise<Address> =>
  (await axiosClient.patch<One>(`/addresses/${id}`, body)).data.data

export const deleteAddress = async (id: number): Promise<void> => {
  await axiosClient.delete(`/addresses/${id}`)
}

export const setDefaultAddress = async (id: number): Promise<Address> =>
  (await axiosClient.post<One>(`/addresses/${id}/default`)).data.data

// "So 1 Le Loi, Ward, District, Province" - bo qua phan trong
export const formatAddress = (a: Pick<Address, 'street' | 'ward' | 'district' | 'province'>) =>
  [a.street, a.ward, a.district, a.province].filter(Boolean).join(', ')
