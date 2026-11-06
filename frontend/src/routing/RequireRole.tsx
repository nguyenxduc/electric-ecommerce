import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useValidateToken } from '../client/hooks/useAuth'

type RequireRoleProps = {
  allow: string[]
  children: ReactNode
}

// Route guard: renders children only when the logged-in user's role is in
// `allow`; otherwise redirects home. Used for /admin/* and /seller/*.
const RequireRole = ({ allow, children }: RequireRoleProps) => {
  const hasToken = !!localStorage.getItem('accessToken')
  const { data, isLoading, isError } = useValidateToken()

  if (!hasToken) {
    return <Navigate to="/" replace />
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const role = data?.user?.role
  if (isError || !role || !allow.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RequireRole
