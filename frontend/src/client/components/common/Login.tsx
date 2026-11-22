import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  User,
  X
} from 'lucide-react'
import { apiErrorMessage } from '../../../lib/apiError'
import {
  useLogin,
  useRegister,
  useValidateToken,
  useVerifyEmail,
  useResendVerification,
  useForgotPassword,
  useResetPassword
} from '../../hooks/useAuth'
import { usePublicSettings } from '../../hooks/useSettings'
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

type FieldProps = {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  trailing?: React.ReactNode
  hint?: string
} & React.InputHTMLAttributes<HTMLInputElement>

// O nhap co nhan hien thi (khong chi placeholder), icon trai, nut phu ben phai
const Field = ({ label, icon: Icon, trailing, hint, className = '', ...input }: FieldProps) => {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <input
          id={id}
          {...input}
          className={`w-full rounded-xl bg-white py-3 text-[15px] text-ink ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-ink ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${trailing ? 'pr-11' : 'pr-3.5'} ${className}`}
        />
        {trailing && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{trailing}</div>}
      </div>
      {hint && <p className="mt-1.5 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

const TextButton = ({ className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    {...props}
    className={`font-medium text-ink underline-offset-4 hover:underline disabled:opacity-50 ${className}`}
  />
)

const Login = ({
  open,
  onClose,
  onLogin,
  onRegister,
  brand,
  onSuccess
}: AuthModalProps) => {
  const { data: settingsData } = usePublicSettings('general')
  const brandName = brand || settingsData?.settings?.store_name || 'Tech Shop'
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
  // Quen mat khau 2 buoc: gui ma ve email -> nhap ma + mat khau moi
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request')
  const [showPassword, setShowPassword] = useState(false)
  const [agreeCondition, setAgreeCondition] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Huong truot khi doi buoc: login(0) -> register(1) -> reset/verify(2).
  // Di toi buoc "sau" thi noi dung moi truot tu phai vao, quay lai thi tu trai.
  const STEP_ORDER = { login: 0, register: 1, reset: 2, verify: 2 } as const
  const stepKey = `${mode}-${resetStep}`
  const prevStep = useRef({ key: stepKey, order: STEP_ORDER[mode] })
  const [slide, setSlide] = useState<'right' | 'left' | null>(null)
  if (prevStep.current.key !== stepKey) {
    const order = STEP_ORDER[mode]
    const next = order >= prevStep.current.order ? 'right' : 'left'
    prevStep.current = { key: stepKey, order }
    setSlide(next)
  }

  // Chieu cao hop co gian muot theo noi dung (form Sign up dai hon Log in)
  const stageInnerRef = useRef<HTMLDivElement>(null)
  const [stageHeight, setStageHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = stageInnerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageHeight(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  const loginMutation = useLogin()
  const registerMutation = useRegister()
  const verifyMutation = useVerifyEmail()
  const resendVerifyMutation = useResendVerification()
  const forgotMutation = useForgotPassword()
  const resetMutation = useResetPassword()
  const { refetch: refetchUser } = useValidateToken()

  // Esc dong, khoa cuon trang phia sau, focus o nhap dau tien
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  // Doi buoc thi dua focus ve o nhap dau tien cua buoc moi
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLElement>('form input')?.focus()
  }, [mode, resetStep, open])

  // Handle login success
  useEffect(() => {
    if (loginMutation.isSuccess) {
      toast.success('Login successful!')
      queryClient.invalidateQueries({ queryKey: ['me'] })
      refetchUser()
      setEmail('')
      setPassword('')
      setMode('login')
      onSuccess?.()
      onClose()
      loginMutation.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loginMutation doi object moi render, chi can reset khi isSuccess
  }, [loginMutation.isSuccess, queryClient, refetchUser, onSuccess, onClose])

  // Handle login error
  useEffect(() => {
    if (loginMutation.isError) {
      const msg = apiErrorMessage(
        loginMutation.error,
        loginMutation.error?.message ||
          'Login failed. Please check your credentials.'
      )
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
      setAgreeCondition(false)
      registerMutation.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- registerMutation doi object moi render, chi can reset khi isSuccess
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
        onLogin(email, password, false)
      } else {
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
        onRegister({ fullName, email, password })
      } else {
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
            setEmail(verifyEmail)
            setMode('login')
          },
          onError: (err: unknown) => {
            toast.error(apiErrorMessage(err, 'Verification failed'))
          }
        }
      )
    } else if (mode === 'reset') {
      if (!resetEmail) {
        toast.error('Enter email to receive code')
        return
      }
      if (resetStep === 'request') {
        sendResetCode()
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
            setResetStep('request')
          },
          onError: (err: unknown) => {
            toast.error(apiErrorMessage(err, 'Password change failed'))
          }
        }
      )
    }
  }

  const sendResetCode = () =>
    forgotMutation.mutate(resetEmail, {
      onSuccess: () => {
        toast.success('Password reset code sent to your email')
        setResetStep('confirm')
      },
      onError: (err: unknown) =>
        toast.error(apiErrorMessage(err, 'Failed to send code'))
    })

  const resendVerify = () => {
    if (!verifyEmail) {
      toast.error('Enter email to resend code')
      return
    }
    resendVerifyMutation.mutate(verifyEmail, {
      onSuccess: () => toast.success('Verification code resent'),
      onError: (err: unknown) => toast.error(apiErrorMessage(err, 'Failed to send code'))
    })
  }

  const pending =
    mode === 'login'
      ? loginMutation.isPending
      : mode === 'register'
      ? registerMutation.isPending
      : mode === 'verify'
      ? verifyMutation.isPending
      : resetStep === 'request'
      ? forgotMutation.isPending
      : resetMutation.isPending

  const title =
    mode === 'login'
      ? `Log in to ${brandName}`
      : mode === 'register'
      ? `Create your ${brandName} account`
      : mode === 'verify'
      ? 'Verify your email'
      : resetStep === 'request'
      ? 'Forgot your password?'
      : 'Set a new password'

  const subtitle =
    mode === 'login'
      ? 'Track orders, save vouchers and check out faster.'
      : mode === 'register'
      ? 'Buy from verified shops, earn loyalty points on every order.'
      : mode === 'verify'
      ? verifyEmail
        ? `Enter the 6-digit code we sent to ${verifyEmail}.`
        : 'Enter your email and the 6-digit code we sent you.'
      : resetStep === 'request'
      ? 'Step 1 of 2 · We will email you a reset code.'
      : `Step 2 of 2 · Enter the code sent to ${resetEmail} and a new password.`

  const submitLabel =
    mode === 'login'
      ? 'Log in'
      : mode === 'register'
      ? 'Create account'
      : mode === 'verify'
      ? 'Verify email'
      : resetStep === 'request'
      ? 'Send reset code'
      : 'Reset password'

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPassword(s => !s)}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      className="rounded-lg p-2 text-gray-400 hover:bg-paper hover:text-ink"
    >
      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  )

  const backToLogin = () => {
    setMode('login')
    setResetStep('request')
  }

  // Portal ra body: Navbar nam trong header co backdrop-blur, ma backdrop-filter
  // bien header thanh khung chua cua moi phan tu position:fixed ben trong -> modal
  // tung bi can giua trong dai header cao 64px, mat ca tieu de va o email.
  return createPortal(
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-ink/40"
      onClick={onClose}
    >
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-6">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-title"
          className="relative w-full max-w-[440px] rounded-t-3xl bg-white px-6 pb-8 pt-6 shadow-[0_32px_80px_-32px_rgb(23_24_27/0.5)] sm:rounded-3xl sm:px-8 sm:pt-8"
          onClick={e => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-paper hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>

          {(mode === 'login' || mode === 'register') ? (
            // Chuyen dang nhap / dang ky dang segmented control
            <div role="tablist" aria-label="Account" className="relative mr-10 inline-grid grid-cols-2 rounded-full bg-paper p-1 text-sm font-medium">
              {/* Nen trang truot ngang sang tab dang chon */}
              <span
                aria-hidden
                className="absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-sm ring-1 ring-gray-200/80 transition-transform duration-300 ease-out"
                style={{ transform: mode === 'register' ? 'translateX(100%)' : 'translateX(0)' }}
              />
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={mode === m}
                  onClick={() => setMode(m)}
                  className={`relative z-10 rounded-full px-4 py-1.5 transition-colors duration-300 ${
                    mode === m ? 'text-ink' : 'text-gray-500 hover:text-ink'
                  }`}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>
          ) : (
            <button
              type="button"
              onClick={backToLogin}
              className="-ml-1 inline-flex items-center gap-1.5 rounded-full px-1 py-1.5 text-sm font-medium text-gray-500 hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" /> Back to log in
            </button>
          )}

          {/* Khung co gian chieu cao; noi dung ben trong truot ngang khi doi buoc.
              Padding/margin am de vong focus cua nut khong bi overflow-hidden cat. */}
          <div
            className="-mx-2 overflow-hidden px-2 transition-[height] duration-300 ease-out"
            style={stageHeight != null ? { height: stageHeight } : undefined}
          >
          <div ref={stageInnerRef} className="flow-root -mb-2 pb-2">
          <div
            key={stepKey}
            className={slide === 'right' ? 'animate-slide-in-right' : slide === 'left' ? 'animate-slide-in-left' : ''}
          >
          {mode === 'verify' && (
            <span className="mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-paper">
              <MailCheck className="h-5 w-5 text-ink" />
            </span>
          )}
          {mode === 'reset' && (
            <span className="mt-6 flex h-11 w-11 items-center justify-center rounded-full bg-paper">
              <KeyRound className="h-5 w-5 text-ink" />
            </span>
          )}

          <h2 id="auth-title" className="mt-5 text-2xl font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-1.5 text-sm text-gray-500">{subtitle}</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <Field
                label="Full name"
                icon={User}
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Jane Nguyen"
              />
            )}

            {(mode === 'login' || mode === 'register' || (mode === 'reset' && resetStep === 'request')) && (
              <Field
                label="Email"
                icon={Mail}
                type="email"
                required
                autoComplete="email"
                value={mode === 'reset' ? resetEmail : email}
                onChange={e =>
                  mode === 'reset' ? setResetEmail(e.target.value) : setEmail(e.target.value)
                }
                placeholder="you@example.com"
              />
            )}

            {(mode === 'login' || mode === 'register') && (
              <div>
                <Field
                  label="Password"
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  {...(mode === 'register' && { minLength: 8 })}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'login' ? 'Your password' : 'At least 8 characters'}
                  trailing={passwordToggle}
                />
                {mode === 'login' && (
                  <div className="mt-2 text-right text-sm">
                    <TextButton
                      onClick={() => {
                        setResetEmail(email)
                        setResetStep('request')
                        setMode('reset')
                      }}
                    >
                      Forgot password?
                    </TextButton>
                  </div>
                )}
              </div>
            )}

            {mode === 'register' && (
              <Field
                label="Confirm password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                aria-invalid={!!confirmPassword && confirmPassword !== password}
                hint={
                  confirmPassword && confirmPassword !== password
                    ? 'Passwords do not match yet.'
                    : undefined
                }
              />
            )}

            {mode === 'verify' && (
              <>
                <Field
                  label="Email"
                  icon={Mail}
                  type="email"
                  required
                  autoComplete="email"
                  value={verifyEmail}
                  onChange={e => setVerifyEmail(e.target.value)}
                  placeholder="you@example.com"
                />
                <Field
                  label="Verification code"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="text-center font-mono text-lg tracking-[0.5em]"
                />
                <p className="text-sm text-gray-500">
                  Didn’t get it?{' '}
                  <TextButton onClick={resendVerify} disabled={resendVerifyMutation.isPending}>
                    {resendVerifyMutation.isPending ? 'Sending…' : 'Resend code'}
                  </TextButton>
                </p>
              </>
            )}

            {mode === 'reset' && resetStep === 'confirm' && (
              <>
                <Field
                  label="Reset code"
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={resetCode}
                  onChange={e => setResetCode(e.target.value)}
                  placeholder="Code from your email"
                  className="font-mono tracking-widest"
                />
                <Field
                  label="New password"
                  icon={Lock}
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  trailing={passwordToggle}
                />
                <div className="flex items-center justify-between text-sm">
                  <TextButton onClick={() => setResetStep('request')} className="text-gray-600">
                    Change email
                  </TextButton>
                  <TextButton onClick={sendResetCode} disabled={forgotMutation.isPending}>
                    {forgotMutation.isPending ? 'Sending…' : 'Resend code'}
                  </TextButton>
                </div>
              </>
            )}

            {mode === 'register' && (
              <label className="flex cursor-pointer items-start gap-2.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={agreeCondition}
                  onChange={e => setAgreeCondition(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-ink"
                />
                <span>
                  I agree to the{' '}
                  <Link to="#" className="font-medium text-ink underline underline-offset-4">
                    Terms & Conditions
                  </Link>
                </span>
              </label>
            )}

            <button type="submit" disabled={pending} className="btn-primary !mt-6 w-full py-3 text-[15px]">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>

            {(mode === 'login' || mode === 'register') && (
              <p className="text-center text-sm text-gray-500">
                {mode === 'login' ? 'New to ' + brandName + '? ' : 'Already have an account? '}
                <TextButton onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Create an account' : 'Log in'}
                </TextButton>
              </p>
            )}
          </form>
          </div>
          </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Login
