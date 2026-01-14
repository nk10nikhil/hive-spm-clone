import { Navigate, useLocation } from 'react-router-dom'
import { useUserStore } from '@/stores/userStore'
import { useEffect, useState } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const initUserProfile = useUserStore((s) => s.initUserProfile)
  const user = useUserStore((s) => s.user)

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token')
      if (!token) {
        setIsChecking(false)
        return
      }

      if (user) {
        setIsAuthenticated(true)
        setIsChecking(false)
        return
      }

      const result = await initUserProfile()
      setIsAuthenticated(!!result)
      setIsChecking(false)
    }

    checkAuth()
  }, [initUserProfile, user])

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />
  }

  return <>{children}</>
}
