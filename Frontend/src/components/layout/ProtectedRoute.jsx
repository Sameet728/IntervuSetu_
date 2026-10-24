import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="grid min-h-dvh place-items-center bg-canvas">
      <span role="status" aria-label="Loading" className="h-8 w-8 animate-spin rounded-full border-2 border-hairline-strong border-t-accent" />
    </div>
  )
  return user ? <Outlet /> : <Navigate to="/login" replace />
}
