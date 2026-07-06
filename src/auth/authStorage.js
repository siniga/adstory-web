const AUTH_TOKEN_KEY = 'screenly-auth-token'
const AUTH_USER_KEY = 'screenly-auth-user'

export function loadAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function loadAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveAuth({ token, user }) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
  localStorage.removeItem(AUTH_USER_KEY)
}

export function notifyUnauthorized() {
  clearAuth()
  window.dispatchEvent(new CustomEvent('screenly:unauthorized'))
}

export function getAuthHeaders() {
  const token = loadAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
