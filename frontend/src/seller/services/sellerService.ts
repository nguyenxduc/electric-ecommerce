import { toast } from 'sonner'
import { apiErrorResponse } from '../../lib/apiError'
import axiosClient from '../../lib/axios'

// ---- Shop vouchers ----
export type ShopCoupon = {
  id: number
  code: string
  description: string | null
  discount_type: 'percent' | 'fixed'
  discount_value: number | string
  min_order: number | string | null
  max_discount: number | string | null
  usage_limit: number | null
  used_count: number | null
  starts_at: string | null
  expires_at: string | null
  is_active: boolean
  status: 'active' | 'scheduled' | 'paused' | 'expired' | 'used_up'
  created_at: string
}

// "" / null = xoa gia tri (khong gioi han / khong lich)
export type ShopCouponInput = {
  description?: string
  discount_type?: 'percent' | 'fixed'
  discount_value?: number
  min_order?: number | null
  max_discount?: number | null
  usage_limit?: number | null
  starts_at?: string | null
  expires_at?: string | null
  is_active?: boolean
}

export const getMyShopCoupons = async (): Promise<ShopCoupon[]> => {
  const { data } = await axiosClient.get('/coupons/shop/mine/list')
  return data.coupons || []
}

export const createShopCoupon = async (payload: ShopCouponInput & { code: string }) => {
  const { data } = await axiosClient.post('/coupons/shop', payload)
  return data
}

// Sua / tam dung / bat lai voucher cua shop minh
export const updateShopCoupon = async (id: number, payload: ShopCouponInput) => {
  const { data } = await axiosClient.put(`/coupons/shop/${id}`, payload)
  return data
}

export const deleteShopCoupon = async (id: number) => {
  const { data } = await axiosClient.delete(`/coupons/shop/${id}`)
  return data
}

// ---- Return requests ----
export type ShopReturnRequest = {
  id: number
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  resolution_note: string | null
  created_at: string
  order: {
    id: number
    order_number: string | null
    total_amount: number | string | null
    created_at: string
  }
  user: { id: number; name: string | null; email: string | null }
}

export const getShopReturns = async (
  status?: string
): Promise<ShopReturnRequest[]> => {
  const { data } = await axiosClient.get('/returns/shop/mine', {
    params: { status }
  })
  return data.data?.requests || []
}

export const resolveReturn = async (
  id: number,
  action: 'approve' | 'reject',
  note?: string
) => {
  const { data } = await axiosClient.patch(`/returns/${id}/resolve`, {
    action,
    note
  })
  return data
}

// ---- Shop settings (pickup address + tax) ----
export const updateShopSettings = async (payload: Record<string, string>) => {
  const { data } = await axiosClient.patch('/shops/me', payload)
  return data
}

// Logo/banner gui rieng (multipart) de loi upload anh khong lam mat cac truong khac
export const uploadShopImages = async (files: { logo?: File | null; banner?: File | null }) => {
  const fd = new FormData()
  if (files.logo) fd.append('logo', files.logo)
  if (files.banner) fd.append('banner', files.banner)
  const { data } = await axiosClient.patch('/shops/me', fd, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data
}

// ---- Shipments ----
export type ShipmentEvent = {
  id: number
  status: string
  description: string | null
  occurred_at: string
}
export type Shipment = {
  id: number
  order_id: number
  carrier: string
  tracking_code: string | null
  status: string
  fee_vnd: number | null
  cod_amount_vnd: number | null
  events?: ShipmentEvent[]
}

export const getOrderShipment = async (
  orderId: number
): Promise<Shipment | null> => {
  const { data } = await axiosClient.get(`/shipments/orders/${orderId}`)
  return data.data || null
}
export const createShipment = async (orderId: number) =>
  (await axiosClient.post(`/shipments/orders/${orderId}`)).data
export const cancelShipment = async (id: number) =>
  (await axiosClient.delete(`/shipments/${id}`)).data
export const simulateShipment = async (id: number, status: string) =>
  (await axiosClient.post(`/shipments/${id}/simulate`, { status })).data

// Fetch an authenticated HTML document and open it in a new tab.
const openHtml = async (url: string) => {
  // Mo tab rong dong bo (con trong user gesture) roi moi await, tranh bi chan popup
  const w = window.open('', '_blank')
  if (!w) return void toast.error('Allow pop-ups to view')
  try {
    const { data } = await axiosClient.get(url, { responseType: 'text' })
    const blobUrl = URL.createObjectURL(new Blob([data], { type: 'text/html' }))
    w.location.href = blobUrl
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch (e) {
    w.close()
    throw e
  }
}
export const openShipmentLabel = (id: number) => openHtml(`/shipments/${id}/label`)
export const openInvoiceHtml = (id: number) => openHtml(`/invoices/${id}/html`)

// ---- Invoices & tax ----
export type Invoice = {
  id: number
  invoice_number: string
  series?: string
  status: 'issued' | 'cancelled'
  total: string
  currency?: string
  issued_at: string
  buyer?: { name?: string; company_name?: string }
}

export const getOrderInvoice = async (orderId: number): Promise<Invoice | null> => {
  try {
    const { data } = await axiosClient.get(`/invoices/orders/${orderId}`)
    return data.data || null
  } catch (e) {
    if (apiErrorResponse(e).status === 404) return null
    throw e
  }
}

export const getMyInvoices = async (page = 1, limit = 10) => {
  const { data } = await axiosClient.get('/invoices/shop/mine', {
    params: { page, limit }
  })
  return data.data as {
    invoices: Invoice[]
    pagination: { current_page: number; total_pages: number; total_count: number }
  }
}

export type TaxMonth = {
  period: string
  orders: number
  base: number | string
  vat: number | string
  pit: number | string
  total_withheld: number | string
}
export const getMyTaxSummary = async (year: number) => {
  const { data } = await axiosClient.get('/tax/shop/mine/summary', {
    params: { year }
  })
  return data.data as { year: number; months: TaxMonth[] }
}
