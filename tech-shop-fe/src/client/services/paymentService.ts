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
  accountName?: string
}

export type BankTransferQRResponse = {
  qrUrl: string
  orderId: string
  amount: number
  accountNo: string
  accountName: string
  bankId: string
  orderInfo: string
}

export const createBankTransferQR = async (payload: CreateBankTransferQRPayload) => {
  const { data } = await axiosClient.post<BankTransferQRResponse>(
    '/payments/bank-transfer-qr',
    payload
  )
  return data
}

