import { useCallback, useEffect, useState } from 'react'
import * as authApi from '../services/authApi'
import { toUserError } from '../utils/sanitizeUserErrorMessage'
import { clearAuth, loadAuthToken, loadAuthUser, saveAuth } from './authStorage'

const UNAUTHORIZED_EVENT = 'screenly:unauthorized'

export function useAuth() {
  const [user, setUser] = useState(() => loadAuthUser())
  const [checking, setChecking] = useState(() => Boolean(loadAuthToken()))
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleUnauthorized = () => {
      clearAuth()
      setUser(null)
      setError('Your session has expired. Please sign in again.')
    }

    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized)
  }, [])

  useEffect(() => {
    const token = loadAuthToken()
    if (!token) {
      setChecking(false)
      return
    }

    const cachedUser = loadAuthUser()
    if (cachedUser) {
      setUser(cachedUser)
      setChecking(false)
      return
    }

    authApi
      .getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser)
        saveAuth({ token, user: currentUser })
      })
      .catch(() => {
        clearAuth()
        setUser(null)
      })
      .finally(() => {
        setChecking(false)
      })
  }, [])

  const login = useCallback(async (credentials) => {
    setError(null)

    try {
      const data = await authApi.login(credentials)
      setUser(data.user)
      return data
    } catch (err) {
      const message = toUserError(err, err?.status, 'auth')
      setError(message)
      return null
    }
  }, [])

  const register = useCallback(async (payload) => {
    setError(null)

    try {
      const data = await authApi.register(payload)
      setUser(data.user)
      return data
    } catch (err) {
      const message = toUserError(err, err?.status, 'auth')
      setError(message)
      return null
    }
  }, [])

  const logout = useCallback(async () => {
    setError(null)
    await authApi.logout()
    setUser(null)
  }, [])

  return {
    user,
    checking,
    error,
    setError,
    login,
    register,
    logout,
    isAuthenticated: Boolean(loadAuthToken() && user),
  }
}
