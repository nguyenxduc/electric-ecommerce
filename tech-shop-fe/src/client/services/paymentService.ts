import axiosClient from '../../lib/axios'

type CreatePaymentPayload = {
  amount: number
  orderInfo?: string
  bankCode?: string
}

export const createVnpayPayment = async (payload: CreatePaymentPayload) => {
  const { data } = await axiosClient.post<{ paymentUrl: string; orderId: string }>(
    '/payments/vnpay',
    payload
  )
  return data
}

type CreateBankTransferQRPayload = {
  amount: number
  orderInfo?: string
}

type CreateMomoPaymentPayload = CreateBankTransferQRPayload & {
  // Link MoMo payment to our internal order for IPN updates.
  orderId?: number
  orderNumber?: string
}

export type BankTransferQRResponse = {
  qrUrl?: string
  payUrl?: string
  deeplink?: string
  orderId: string
  requestId?: string
  amount: number
  partnerCode?: string
  resultCode?: number
  message?: string
  orderInfo: string
}

export const createBankTransferQR = async (payload: CreateBankTransferQRPayload) => {
  const { data } = await axiosClient.post<BankTransferQRResponse>(
    '/payments/bank-transfer-qr',
    payload
  )
  return data
}

export const createMomoPayment = async (payload: CreateMomoPaymentPayload) => {
  const { data } = await axiosClient.post<BankTransferQRResponse>('/payments/momo', payload)
  return data
}

