import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  useLogin,
  useRegister,
  useValidateToken,
  useVerifyEmail,
  useResendVerification,
  useForgotPassword,
  useResetPassword
} from '../../hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  onLogin?: (email: string, password: string, remember: boolean) => void
  onRegister?: (payload: {
    fullName: string
    email: string
    password: string
  }) => void
  onForgotPassword?: () => void
  onLoginWithGoogle?: () => void
  onLoginWithFacebook?: () => void
  brand?: string
  onSuccess?: () => void
}

const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M17 21.25H7C3.35 21.25 1.25 19.15 1.25 15.5V8.5C1.25 4.85 3.35 2.75 7 2.75H17C20.65 2.75 22.75 4.85 22.75 8.5V15.5C22.75 19.15 20.65 21.25 17 21.25ZM7 4.25C4.14 4.25 2.75 5.64 2.75 8.5V15.5C2.75 18.36 4.14 19.75 7 19.75H17C19.86 19.75 21.25 18.36 21.25 15.5V8.5C21.25 5.64 19.86 4.25 17 4.25H7Z"
      fill="#B4B4B4"
    />
    <path
      d="M11.9998 12.87C11.1598 12.87 10.3098 12.61 9.65978 12.08L6.52978 9.57997C6.20978 9.31997 6.14978 8.84997 6.40978 8.52997C6.66978 8.20997 7.13978 8.14997 7.45978 8.40997L10.5898 10.91C11.3498 11.52 12.6398 11.52 13.3998 10.91L16.5298 8.40997C16.8498 8.14997 17.3298 8.19997 17.5798 8.52997C17.8398 8.84997 17.7898 9.32997 17.4598 9.57997L14.3298 12.08C13.6898 12.61 12.8398 12.87 11.9998 12.87Z"
      fill="#B4B4B4"
    />
  </svg>
)

const LockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M6.18014 22.75C6.08014 22.75 5.97014 22.74 5.88014 22.73L3.71014 22.43C2.67014 22.29 1.73014 21.36 1.57014 20.3L1.27014 18.11C1.17014 17.41 1.47014 16.5 1.97014 15.99L6.36014 11.6C5.65014 8.76002 6.47014 5.76001 8.56014 3.69001C11.8001 0.460015 17.0701 0.450015 20.3201 3.69001C21.8901 5.26002 22.7501 7.35001 22.7501 9.57001C22.7501 11.79 21.8901 13.88 20.3201 15.45C18.2201 17.53 15.2301 18.35 12.4101 17.63L8.01014 22.02C7.59014 22.46 6.84014 22.75 6.18014 22.75ZM14.4301 2.76001C12.6801 2.76001 10.9401 3.42001 9.61014 4.75001C7.81014 6.54001 7.16014 9.16002 7.91014 11.6C7.99014 11.87 7.92014 12.15 7.72014 12.35L3.02014 17.05C2.85014 17.22 2.71014 17.66 2.74014 17.89L3.04014 20.08C3.10014 20.46 3.51014 20.89 3.89014 20.94L6.07014 21.24C6.31014 21.28 6.75014 21.14 6.92014 20.97L11.6401 16.26C11.8401 16.06 12.1301 16 12.3901 16.08C14.8001 16.84 17.4301 16.19 19.2301 14.39C20.5101 13.11 21.2201 11.39 21.2201 9.57001C21.2201 7.74002 20.5101 6.03001 19.2301 4.75001C17.9301 3.43001 16.1801 2.76001 14.4301 2.76001Z"
      fill="#B4B4B4"
    />
    <path
      d="M9.19008 20.54C9.00008 20.54 8.81008 20.47 8.66008 20.32L6.36008 18.02C6.07008 17.73 6.07008 17.25 6.36008 16.96C6.65008 16.67 7.13008 16.67 7.42008 16.96L9.72008 19.26C10.0101 19.55 10.0101 20.03 9.72008 20.32C9.57008 20.47 9.38008 20.54 9.19008 20.54Z"
      fill="#B4B4B4"
    />
    <path
      d="M14.5 11.75C13.26 11.75 12.25 10.74 12.25 9.5C12.25 8.26 13.26 7.25 14.5 7.25C15.74 7.25 16.75 8.26 16.75 9.5C16.75 10.74 15.74 11.75 14.5 11.75ZM14.5 8.75C14.09 8.75 13.75 9.09 13.75 9.5C13.75 9.91 14.09 10.25 14.5 10.25C14.91 10.25 15.25 9.91 15.25 9.5C15.25 9.09 14.91 8.75 14.5 8.75Z"
      fill="#B4B4B4"
    />
  </svg>
)

const EyeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M9.46992 15.28C9.27992 15.28 9.08992 15.21 8.93992 15.06C8.11992 14.24 7.66992 13.15 7.66992 12C7.66992 9.61001 9.60992 7.67001 11.9999 7.67001C13.1499 7.67001 14.2399 8.12001 15.0599 8.94001C15.1999 9.08001 15.2799 9.27001 15.2799 9.47001C15.2799 9.67001 15.1999 9.86001 15.0599 10L9.99992 15.06C9.84992 15.21 9.65992 15.28 9.46992 15.28ZM11.9999 9.17001C10.4399 9.17001 9.16992 10.44 9.16992 12C9.16992 12.5 9.29992 12.98 9.53992 13.4L13.3999 9.54001C12.9799 9.30001 12.4999 9.17001 11.9999 9.17001Z"
      fill="#B4B4B4"
    />
    <path
      d="M5.59984 18.51C5.42984 18.51 5.24984 18.45 5.10984 18.33C4.03984 17.42 3.07984 16.3 2.25984 15C1.19984 13.35 1.19984 10.66 2.25984 9.00001C4.69984 5.18001 8.24984 2.98001 11.9998 2.98001C14.1998 2.98001 16.3698 3.74001 18.2698 5.17001C18.5998 5.42001 18.6698 5.89001 18.4198 6.22001C18.1698 6.55001 17.6998 6.62001 17.3698 6.37001C15.7298 5.13001 13.8698 4.48001 11.9998 4.48001C8.76984 4.48001 5.67984 6.42001 3.51984 9.81001C2.76984 10.98 2.76984 13.02 3.51984 14.19C4.26984 15.36 5.12984 16.37 6.07984 17.19C6.38984 17.46 6.42984 17.93 6.15984 18.25C6.01984 18.42 5.80984 18.51 5.59984 18.51Z"
      fill="#B4B4B4"
    />
    <path
      d="M11.9996 21.02C10.6696 21.02 9.36957 20.75 8.11957 20.22C7.73957 20.06 7.55957 19.62 7.71957 19.24C7.87957 18.86 8.31957 18.68 8.69957 18.84C9.75957 19.29 10.8696 19.52 11.9896 19.52C15.2196 19.52 18.3096 17.58 20.4696 14.19C21.2196 13.02 21.2196 10.98 20.4696 9.81C20.1596 9.32 19.8196 8.85 19.4596 8.41C19.1996 8.09 19.2496 7.62 19.5696 7.35C19.8896 7.09 20.3596 7.13 20.6296 7.46C21.0196 7.94 21.3996 8.46 21.7396 9C22.7996 10.65 22.7996 13.34 21.7396 15C19.2996 18.82 15.7496 21.02 11.9996 21.02Z"
      fill="#B4B4B4"
    />
    <path
      d="M12.6896 16.27C12.3396 16.27 12.0196 16.02 11.9496 15.66C11.8696 15.25 12.1396 14.86 12.5496 14.79C13.6496 14.59 14.5696 13.67 14.7696 12.57C14.8496 12.16 15.2396 11.9 15.6496 11.97C16.0596 12.05 16.3296 12.44 16.2496 12.85C15.9296 14.58 14.5496 15.95 12.8296 16.27C12.7796 16.26 12.7396 16.27 12.6896 16.27Z"
      fill="#B4B4B4"
    />
    <path
      d="M2.00043 22.75C1.81043 22.75 1.62043 22.68 1.47043 22.53C1.18043 22.24 1.18043 21.76 1.47043 21.47L8.94043 14C9.23043 13.71 9.71043 13.71 10.0004 14C10.2904 14.29 10.2904 14.77 10.0004 15.06L2.53043 22.53C2.38043 22.68 2.19043 22.75 2.00043 22.75Z"
      fill="#B4B4B4"
    />
    <path
      d="M14.5297 10.22C14.3397 10.22 14.1497 10.15 13.9997 10C13.7097 9.71 13.7097 9.23 13.9997 8.94L21.4697 1.47C21.7597 1.18 22.2397 1.18 22.5297 1.47C22.8197 1.76 22.8197 2.24 22.5297 2.53L15.0597 10C14.9097 10.15 14.7197 10.22 14.5297 10.22Z"
      fill="#B4B4B4"
    />
  </svg>
)
const EyeOffIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    {...props}
  >
    <path d="M3 3l18 18" />
    <path d="M9.9 5.2A10.33 10.33 0 0 1 12 5c6 0 10 7 10 7a16.65 16.65 0 0 1-3.15 3.89M6.35 6.35C3.9 8.19 2 12 2 12a16.45 16.45 0 0 0 6.2 6.2M9 9a3 3 0 1 0 4.24 4.24" />
  </svg>
)

const ProfileIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 12.75C8.83 12.75 6.25 10.17 6.25 7C6.25 3.83 8.83 1.25 12 1.25C15.17 1.25 17.75 3.83 17.75 7C17.75 10.17 15.17 12.75 12 12.75ZM12 2.75C9.66 2.75 7.75 4.66 7.75 7C7.75 9.34 9.66 11.25 12 11.25C14.34 11.25 16.25 9.34 16.25 7C16.25 4.66 14.34 2.75 12 2.75Z"
      fill="#B4B4B4"
    />
    <path
      d="M20.5901 22.75C20.1801 22.75 19.8401 22.41 19.8401 22C19.8401 18.55 16.3202 15.75 12.0002 15.75C7.68015 15.75 4.16016 18.55 4.16016 22C4.16016 22.41 3.82016 22.75 3.41016 22.75C3.00016 22.75 2.66016 22.41 2.66016 22C2.66016 17.73 6.85015 14.25 12.0002 14.25C17.1502 14.25 21.3401 17.73 21.3401 22C21.3401 22.41 21.0001 22.75 20.5901 22.75Z"
      fill="#B4B4B4"
    />
  </svg>
)

const Login = ({
  open,
  onClose,
  onLogin,
  onRegister,
  onForgotPassword,
  onLoginWithGoogle,
  onLoginWithFacebook,
  brand = 'Tech Heim',
  onSuccess
}: AuthModalProps) => {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [mode, setMode] = useState<'login' | 'register' | 'verify' | 'reset'>(
    'login'
  )
  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [agreeCondition, setAgreeCondition] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const verifyMutation = useVerifyEmail()
  const resendVerifyMutation = useResendVerification()
  const forgotMutation = useForgotPassword()
  const resetMutation = useResetPassword()
  const { refetch: refetchUser } = useValidateToken()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const first = dialogRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    )
    first?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Handle login success
  useEffect(() => {
    if (loginMutation.isSuccess) {
      toast.success('Login successful!')
      queryClient.invalidateQueries({ queryKey: ['me'] })
      refetchUser()
      setEmail('')
      setPassword('')
      setRemember(false)
      setMode('login')
      onSuccess?.()
      onClose()
      loginMutation.reset()
    }
  }, [loginMutation.isSuccess, queryClient, refetchUser, onSuccess, onClose])

  // Handle login error
  useEffect(() => {
    if (loginMutation.isError) {
      const msg =
        (loginMutation.error as any)?.response?.data?.error ||
        loginMutation.error?.message ||
        'Login failed. Please check your credentials.'
      if (msg.toLowerCase().includes('not verified')) {
        toast.error('Email not verified. Enter code to activate.')
        setVerifyEmail(email)
        setMode('verify')
      } else {
        toast.error(msg)
      }
      loginMutation.reset()
    }
  }, [loginMutation.isError, loginMutation.error, loginMutation, email])

  // Handle register success
  useEffect(() => {
    if (registerMutation.isSuccess) {
      toast.success(
        'Registration successful. Check email for verification code.'
      )
      setVerifyEmail(email)
      setMode('verify')
      setTab('login')
      setAgreeCondition(false)
      registerMutation.reset()
    }
  }, [registerMutation.isSuccess, email])

  // Handle register error
  useEffect(() => {
    if (registerMutation.isError) {
      toast.error(
        registerMutation.error?.message ||
          'Registration failed. Please try again.'
      )
      registerMutation.reset()
    }
  }, [registerMutation.isError, registerMutation.error, registerMutation])

  if (!open) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === 'login') {
      if (onLogin) {
        // Use callback if provided (for backward compatibility)
        onLogin(email, password, remember)
      } else {
        // Use hook directly
        loginMutation.mutate({ email, password })
      }
    } else if (mode === 'register') {
      if (!agreeCondition) {
        toast.error('You must agree to the Terms & Conditions')
        return
      }
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      if (onRegister) {
        // Use callback if provided (for backward compatibility)
        onRegister({ fullName, email, password })
      } else {
        // Use hook directly
        registerMutation.mutate({
          name: fullName,
          email,
          password
        })
      }
    } else if (mode === 'verify') {
      if (!verifyEmail || !verifyCode) {
        toast.error('Enter email and verification code')
        return
      }
      verifyMutation.mutate(
        { email: verifyEmail, code: verifyCode },
        {
          onSuccess: () => {
            toast.success('Verification successful, please log in')
            setMode('login')
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Verification failed')
          }
        }
      )
    } else if (mode === 'reset') {
      if (!resetEmail) {
        toast.error('Enter email to receive code')
        return
      }
      if (!resetCode || !newPassword) {
        toast.error('Enter code and new password')
        return
      }
      resetMutation.mutate(
        { email: resetEmail, code: resetCode, new_password: newPassword },
        {
          onSuccess: () => {
            toast.success('Password changed successfully, please log in')
            setMode('login')
            setEmail(resetEmail)
            setPassword('')
            setResetCode('')
            setNewPassword('')
          },
          onError: (err: any) => {
            toast.error(err?.response?.data?.error || 'Password change failed')
          }
        }
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Dialog */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          className="w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
          onClick={e => e.stopPropagation()}
        >
          {/* Tabs */}
          <div className="flex items-center justify-center pt-5">
            <button
              className={`pb-2 px-10 text-sm font-light ${
                tab === 'login'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 border-b-2 border-gray-500'
              }`}
              onClick={() => {
                setTab('login')
                setMode('login')
              }}
            >
              Log in
            </button>
            <button
              className={`pb-2 px-10 text-sm font-light ${
                tab === 'register'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 border-b-2 border-gray-500'
              }`}
              onClick={() => {
                setTab('register')
                setMode('register')
              }}
            >
              Create Account
            </button>
          </div>

          <div className="px-8 pb-8">
            <h2 className="text-2xl sm:text-3xl font-normal text-center mt-8">
              {mode === 'login'
                ? `Log in to ${brand}`
                : mode === 'register'
                ? `Create your ${brand} account`
                : mode === 'verify'
                ? 'Verify Email'
                : 'Forgot Password'}
            </h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === 'register' && (
                <label className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <ProfileIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              )}

              {/* Email */}
              {mode !== 'verify' && (
                <label className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <MailIcon className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={mode === 'reset' ? resetEmail : email}
                    onChange={e =>
                      mode === 'reset'
                        ? setResetEmail(e.target.value)
                        : setEmail(e.target.value)
                    }
                    placeholder="E-mail"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              )}

              {/* Password */}
              {(mode === 'login' || mode === 'register') && (
                <label className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <LockIcon className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    {...(mode === 'register' && { minLength: 8 })}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    aria-label={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                  >
                    {showPassword ? (
                      <EyeOffIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </label>
              )}

              {/* Confirm password */}
              {mode === 'register' && (
                <label className="relative block">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <LockIcon className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full rounded-lg border border-gray-300 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </label>
              )}

              {/* Verify form */}
              {mode === 'verify' && (
                <>
                  <label className="relative block">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <MailIcon className="w-5 h-5" />
                    </span>
                    <input
                      type="email"
                      required
                      value={verifyEmail}
                      onChange={e => setVerifyEmail(e.target.value)}
                      placeholder="Email to verify"
                      className="w-full rounded-lg border border-gray-300 pl-10 pr-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="block">
                    <input
                      type="text"
                      required
                      value={verifyCode}
                      onChange={e => setVerifyCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        if (!verifyEmail) {
                          toast.error('Enter email to resend code')
                          return
                        }
                        resendVerifyMutation.mutate(verifyEmail, {
                          onSuccess: () =>
                            toast.success('Verification code resent'),
                          onError: (err: any) =>
                            toast.error(
                              err?.response?.data?.error ||
                                'Failed to send code'
                            )
                        })
                      }}
                      className="text-blue-600 hover:underline"
                    >
                      Resend Code
                    </button>
                    {resendVerifyMutation.isPending && (
                      <span className="text-xs text-gray-500">Sending...</span>
                    )}
                  </div>
                </>
              )}

              {/* Reset password form */}
              {mode === 'reset' && (
                <>
                  <label className="block">
                    <input
                      type="text"
                      value={resetCode}
                      onChange={e => setResetCode(e.target.value)}
                      placeholder="Reset code sent to email"
                      className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                  <label className="block">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="New password (>=6)"
                      className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      minLength={6}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!resetEmail) {
                        toast.error('Enter email first')
                        return
                      }
                      forgotMutation.mutate(resetEmail, {
                        onSuccess: () =>
                          toast.success('Password reset code sent'),
                        onError: (err: any) =>
                          toast.error(
                            err?.response?.data?.error || 'Failed to send code'
                          )
                      })
                    }}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Send Password Reset Code
                  </button>
                </>
              )}

              {/* Remember + Forgot */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2"></label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email)
                      setMode('reset')
                    }}
                    className="text-blue-600 hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}

              {mode === 'register' && (
                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={agreeCondition}
                      onChange={e => setAgreeCondition(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-600">I agree to all</span>
                    <Link to="#" className="text-blue-600 hover:underline">
                      Terms & Conditions
                    </Link>
                  </label>
                </div>
              )}

              {/* Primary action */}
              <button
                type="submit"
                disabled={
                  mode === 'login'
                    ? loginMutation.isPending
                    : mode === 'register'
                    ? registerMutation.isPending
                    : mode === 'verify'
                    ? verifyMutation.isPending
                    : resetMutation.isPending
                }
                className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-light hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {(mode === 'login' && loginMutation.isPending) ||
                (mode === 'register' && registerMutation.isPending) ||
                (mode === 'verify' && verifyMutation.isPending) ||
                (mode === 'reset' && resetMutation.isPending) ? (
                  <span className="w-5 h-5 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                ) : null}
                {mode === 'login'
                  ? 'Log in'
                  : mode === 'register'
                  ? 'Create Account'
                  : mode === 'verify'
                  ? 'Verify Email'
                  : 'Reset Password'}
              </button>

              {/* Footer */}
              <p className="text-center text-sm text-gray-500">
                {mode === 'login' ? (
                  <>
                    Don’t have an account ?
                    <button
                      type="button"
                      onClick={() => {
                        setTab('register')
                        setMode('register')
                      }}
                      className="text-blue-600 ml-1 hover:underline"
                    >
                      sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account ?
                    <button
                      type="button"
                      onClick={() => {
                        setTab('login')
                        setMode('login')
                      }}
                      className="text-blue-600 ml-1 hover:underline"
                    >
                      log in
                    </button>
                  </>
                )}
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
