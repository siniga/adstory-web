import { Navigate, Outlet } from 'react-router-dom'

export default function RequireAuth({ isAuthenticated }) {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
