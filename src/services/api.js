import { API_URL } from '../config/api'
import { getAuthHeaders, notifyUnauthorized } from '../auth/authStorage'
import { handleFixtureRequest } from '../fixtures/mockApi'
import { sanitizeUserErrorMessage } from '../utils/sanitizeUserErrorMessage'

export { API_URL }

const SCENEBOARD_COOLDOWN_MS = 3000

function getCacheRoot() {
  if (typeof globalThis === 'undefined') return null
  globalThis.__apiCache =
    globalThis.__apiCache || {
      inflight: new Map(),
      last: new Map(),
      coolUntil: new Map(),
    }
  return globalThis.__apiCache
}

function isAuthEndpoint(endpoint = '') {
  return /^\/api\/auth(\/|$)/.test(endpoint)
}

function isLiveEndpoint(endpoint = '') {
  return isAuthEndpoint(endpoint) || /^\/api\/projects(\/|$|\?)/.test(endpoint)
}

function formatError(message, status, { sanitize = true, fallbackMessage } = {}) {
  if (sanitize) {
    return new Error(sanitizeUserErrorMessage(message ?? fallbackMessage, status))
  }
  return new Error(message ?? fallbackMessage ?? 'Request failed')
}

function firstValidationMessage(data) {
  if (!data?.errors || typeof data.errors !== 'object') return null
  const first = Object.values(data.errors).flat()[0]
  return typeof first === 'string' ? first : null
}

/**
 * Shared HTTP client.
 * Auth and projects hit the live API; other routes still use fixtures until they are migrated.
 */
export async function apiRequest(
  endpoint,
  {
    method = 'GET',
    body,
    payload,
    headers,
    auth = true,
    requireSuccess = false,
    sanitize = true,
    allowEmptyJson = false,
    fallbackMessage = 'Request failed',
    cacheSceneboardGet = false,
  } = {}
) {
  const httpMethod = (method || 'GET').toUpperCase()
  const requestBody = body !== undefined ? body : payload
  const isGet = httpMethod === 'GET'
  const useSceneboardCache =
    cacheSceneboardGet && isGet && /\/sceneboard\/?$/.test(endpoint)
  const cacheRoot = useSceneboardCache ? getCacheRoot() : null

  if (useSceneboardCache && cacheRoot) {
    const key = endpoint
    if (cacheRoot.inflight.has(key)) {
      return cacheRoot.inflight.get(key)
    }
    const coolUntil = cacheRoot.coolUntil.get(key) ?? 0
    if (Date.now() < coolUntil && cacheRoot.last.has(key)) {
      return cacheRoot.last.get(key)
    }
  }

  const execute = async () => {
    if (isLiveEndpoint(endpoint)) {
      return executeLive({
        endpoint,
        httpMethod,
        requestBody,
        headers,
        auth,
        requireSuccess,
        sanitize,
        allowEmptyJson,
        fallbackMessage,
      })
    }

    let data = null
    try {
      data = await handleFixtureRequest(httpMethod, endpoint, requestBody)
    } catch (error) {
      if (error?.status === 401 && auth && !isAuthEndpoint(endpoint)) {
        notifyUnauthorized()
      }
      throw formatError(error?.payload?.message ?? error?.message ?? fallbackMessage, error?.status, {
        sanitize,
        fallbackMessage,
      })
    }

    if (data == null) {
      if (allowEmptyJson) return null
      throw formatError(fallbackMessage, undefined, { sanitize, fallbackMessage })
    }

    const failed = requireSuccess && !isAuthEndpoint(endpoint) && !data?.success
    if (failed) {
      throw formatError(data?.message ?? fallbackMessage, undefined, {
        sanitize,
        fallbackMessage,
      })
    }

    return data
  }

  if (!useSceneboardCache || !cacheRoot) {
    return execute()
  }

  const key = endpoint
  const request = execute()
    .then((data) => {
      cacheRoot.last.set(key, data)
      cacheRoot.coolUntil.set(key, Date.now() + SCENEBOARD_COOLDOWN_MS)
      return data
    })
    .finally(() => {
      cacheRoot.inflight.delete(key)
    })

  cacheRoot.inflight.set(key, request)
  return request
}

async function executeLive({
  endpoint,
  httpMethod,
  requestBody,
  headers,
  auth,
  requireSuccess,
  sanitize,
  allowEmptyJson,
  fallbackMessage,
}) {
  let response
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: httpMethod,
      headers: {
        Accept: 'application/json',
        ...(requestBody != null && httpMethod !== 'GET' ? { 'Content-Type': 'application/json' } : {}),
        ...(auth ? getAuthHeaders() : {}),
        ...headers,
      },
      body: requestBody != null && httpMethod !== 'GET' ? JSON.stringify(requestBody) : undefined,
    })
  } catch {
    throw formatError(
      'We could not reach the server. Check your internet connection and try again.',
      undefined,
      { sanitize, fallbackMessage }
    )
  }

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (response.status === 401 && auth && !isAuthEndpoint(endpoint)) {
    notifyUnauthorized()
  }

  if (!response.ok) {
    throw formatError(
      data?.message ?? firstValidationMessage(data) ?? fallbackMessage,
      response.status,
      { sanitize, fallbackMessage }
    )
  }

  if (data == null) {
    if (allowEmptyJson) return null
    throw formatError(fallbackMessage, undefined, { sanitize, fallbackMessage })
  }

  if (requireSuccess && !isAuthEndpoint(endpoint) && data.success === false) {
    throw formatError(data?.message ?? fallbackMessage, undefined, {
      sanitize,
      fallbackMessage,
    })
  }

  return data
}

export function apiGet(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'GET' })
}

export function apiPost(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'POST', body })
}

export function apiPut(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'PUT', body })
}

export function apiPatch(endpoint, body, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'PATCH', body })
}

export function apiDelete(endpoint, options = {}) {
  return apiRequest(endpoint, { ...options, method: 'DELETE' })
}
