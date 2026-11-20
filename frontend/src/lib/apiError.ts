import { isAxiosError } from 'axios'

// Thong bao loi tu response API: backend tra { message } hoac { error }.
// Thay cho `(err: any) => err?.response?.data?.message || ...` rai rac.
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as { message?: unknown; error?: unknown } | undefined
    if (typeof data?.message === 'string' && data.message) return data.message
    if (typeof data?.error === 'string' && data.error) return data.error
  }
  return fallback
}

// Ma trang thai + body cua loi API, cho cac nhanh can xu ly theo ma (vd. 403 OTP)
export const apiErrorResponse = (err: unknown) =>
  isAxiosError(err)
    ? { status: err.response?.status, data: err.response?.data as Record<string, unknown> | undefined }
    : { status: undefined, data: undefined }
