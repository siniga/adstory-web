const TECHNICAL_PATTERNS = [
  /SQLSTATE/i,
  /\bSQL:/i,
  /Connection:\s*\w+/i,
  /PDOException/i,
  /QueryException/i,
  /Illuminate\\/i,
  /Stack trace:/i,
  /vendor[/\\]/i,
  /target machine actively refused/i,
  /Connection refused/i,
  /could not be made because/i,
  /cURL error/i,
  /syntax error/i,
  /Undefined (array key|index|variable)/i,
  /Database:\s*\w+/i,
  /Host:\s*[\d.]+/i,
  /Port:\s*\d+/i,
  /`[^`]+`/,
  /select\s+.+\s+from/i,
  /insert\s+into/i,
  /update\s+.+\s+set/i,
  /delete\s+from/i,
  /gemini/i,
  /api key/i,
  /google ai/i,
  /xampp/i,
  /artisan/i,
  /prepayment credits/i,
  /php artisan/i,
]

const AUTH_SAFE_MAX_LENGTH = 120

const STATUS_FALLBACKS = {
  401: 'Invalid email or password.',
  403: 'You do not have permission to do that.',
  404: 'The requested resource was not found.',
  422: 'Please check your input and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  503: 'The service is temporarily unavailable. Please try again later.',
}

function isTechnicalError(message) {
  return TECHNICAL_PATTERNS.some((pattern) => pattern.test(message))
}

function isAuthSafeMessage(message) {
  const trimmed = message.trim()

  if (!trimmed || trimmed.length > AUTH_SAFE_MAX_LENGTH) {
    return false
  }

  return !isTechnicalError(trimmed)
}

function coerceErrorText(error) {
  if (typeof error === 'string') {
    return error
  }

  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error.message
  }

  return ''
}

function isDatabaseConnectionError(message) {
  const lower = String(message ?? '').toLowerCase()
  return (
    /sqlstate/i.test(message) ||
    lower.includes('connection refused') ||
    lower.includes('actively refused') ||
    lower.includes('could not be made because') ||
    lower.includes('connection: mysql') ||
    lower.includes('no connection could be made')
  )
}

function getFallback(status, context) {
  if (context === 'database') {
    return 'Something went wrong. Please try again.'
  }

  if (context === 'auth') {
    if (status === 401) {
      return 'Invalid email or password.'
    }
    if (status == null || status >= 500) {
      return 'Unable to sign in right now. Please try again later.'
    }
    return 'Sign in failed. Please try again.'
  }

  if (status === 401) {
    return 'Please sign in again.'
  }

  if (status != null && STATUS_FALLBACKS[status]) {
    return STATUS_FALLBACKS[status]
  }

  if (status != null && status >= 500) {
    return 'Something went wrong on our end. Please try again later.'
  }

  return 'Something went wrong. Please try again.'
}

export function sanitizeUserErrorMessage(message, status, context = 'default') {
  const text = coerceErrorText(message)

  if (context === 'auth') {
    if (text && isAuthSafeMessage(text)) {
      return text.trim()
    }

    return getFallback(status, context)
  }

  if (!text) {
    return getFallback(status, context)
  }

  const trimmed = text.trim()

  if (isDatabaseConnectionError(trimmed)) {
    return getFallback(status, 'database')
  }

  if (!trimmed || isTechnicalError(trimmed) || trimmed.length > 200) {
    return getFallback(status, context)
  }

  return trimmed
}

export function toUserError(error, status, context = 'default') {
  const resolvedStatus =
    status ?? (error && typeof error === 'object' && 'status' in error ? error.status : null)

  return sanitizeUserErrorMessage(coerceErrorText(error), resolvedStatus, context)
}
