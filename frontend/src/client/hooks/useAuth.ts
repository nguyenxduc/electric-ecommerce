import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearRecentlyViewed } from '../utils/recentlyViewed'
import {
  login as loginSvc,
  register as registerSvc,
  logout as logoutSvc,
  validateToken as meSvc,
  updateProfile as updateProfileSvc,
  changePassword as changePasswordSvc,
  uploadAvatar as uploadAvatarSvc,
  deleteAvatar as deleteAvatarSvc,
  resendVerification as resendVerificationSvc,
  verifyEmail as verifyEmailSvc,
  forgotPassword as forgotPasswordSvc,
  resetPassword as resetPasswordSvc,
  type RegisterReq
} from '../services/authService'
import type { AuthReq, AuthRes, AuthUser } from '../types/auth'

// Dang nhap/dang ky xoa cache: du lieu cua nguoi truoc (theo doi shop, gio...) khong duoc lo sang nguoi moi
export const useLogin = () => {
  const qc = useQueryClient()
  return useMutation<AuthRes, Error, AuthReq>({
    mutationFn: payload => loginSvc(payload),
    // resetQueries: bo du lieu nguoi cu va tai lai query dang hien (clear lam component dang mo dung hinh)
    onSuccess: () => qc.resetQueries()
  })
}

export const useRegister = () => {
  const qc = useQueryClient()
  return useMutation<unknown, Error, RegisterReq>({
    mutationFn: payload => registerSvc(payload),
    // resetQueries: bo du lieu nguoi cu va tai lai query dang hien (clear lam component dang mo dung hinh)
    onSuccess: () => qc.resetQueries()
  })
}

export const useValidateToken = () => {
  const hasToken = !!localStorage.getItem('accessToken')

  return useQuery<{ user: AuthUser }, Error>({
    queryKey: ['me'],
    queryFn: meSvc,
    enabled: hasToken, // Only fetch if token exists
    staleTime: 5 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })
}

export const useLogout = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => logoutSvc(),
    onSuccess: () => {
      // Xoa het cache cua nguoi dung truoc (so dia chi, voucher, gio, don hang):
      // nguoi khac dang nhap cung tab khong duoc thay du lieu ca nhan cu
      qc.clear()
      clearRecentlyViewed()
    }
  })
}

export const useUpdateProfile = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateProfileSvc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
    }
  })
}

export const useChangePassword = () =>
  useMutation({ mutationFn: changePasswordSvc })

export const useUploadAvatar = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: uploadAvatarSvc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
    }
  })
}

export const useDeleteAvatar = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAvatarSvc,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] })
    }
  })
}

export const useResendVerification = () =>
  useMutation({
    mutationFn: (email: string) => resendVerificationSvc(email)
  })

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyEmailSvc(email, code)
  })

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (email: string) => forgotPasswordSvc(email)
  })

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({
      email,
      code,
      new_password
    }: {
      email: string
      code: string
      new_password: string
    }) => resetPasswordSvc(email, code, new_password)
  })
