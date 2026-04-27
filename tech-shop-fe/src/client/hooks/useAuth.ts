import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export const useLogin = () =>
  useMutation<AuthRes, Error, AuthReq>({
    mutationFn: payload => loginSvc(payload)
  })

export const useRegister = () =>
  useMutation<any, Error, RegisterReq>({
    mutationFn: payload => registerSvc(payload)
  })

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
      qc.removeQueries({ queryKey: ['me'] })
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
