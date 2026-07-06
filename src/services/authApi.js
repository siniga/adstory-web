import { API_URL } from '../config/api'
import { clearAuth, loadAuthToken, saveAuth } from '../auth/authStorage'

function authHeaders() {
  const token = loadAuthToken()
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

async function requestAuth(endpoint, { method = 'GET', body, fallbackMessage } = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: authHeaders(),
    body: body != null ? JSON.stringify(body) : undefined,
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    if (!res.ok) {
      throw new Error(fallbackMessage)
    }
  }

  if (!res.ok) {
    throw new Error(data?.message ?? fallbackMessage)
  }

  return data
}

export async function login({ email, password }) {
  const data = await requestAuth('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    fallbackMessage: 'Login failed',
  })

  const token = data.token ?? data.access_token
  const user = data.user ?? { name: email?.split('@')[0] ?? 'Creator', email }

  if (!token) {
    throw new Error('Login failed: missing token')
  }

  saveAuth({ token, user })
  return { token, user }
}

export async function register({ name, email, password }) {
  const data = await requestAuth('/api/auth/register', {
    method: 'POST',
    body: { name, email, password },
    fallbackMessage: 'Registration failed',
  })

  const token = data.token ?? data.access_token
  const user = data.user ?? { name, email }

  if (!token) {
    throw new Error('Registration failed: missing token')
  }

  saveAuth({ token, user })
  return { token, user }
}

export async function getCurrentUser() {
  const data = await requestAuth('/api/auth/user', {
    fallbackMessage: 'Not authenticated',
  })

  return data.user ?? data
}

export async function logout() {
  try {
    await requestAuth('/api/auth/logout', {
      method: 'POST',
      fallbackMessage: 'Logout failed',
    })
  } catch {
    // Clear local session even if the API logout fails.
  }

  clearAuth()
}
