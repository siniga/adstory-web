export function logFullLoadedOnce(reason) {
  console.log('[Full] loaded once', reason)
}

export function logPollingStarted(endpoint) {
  console.log('[Polling] started', endpoint)
}

export function logPollingStopped(endpoint) {
  console.log('[Polling] stopped', endpoint)
}

/**
 * Runs a /full loader at most once per in-flight call (dedupes concurrent requests).
 */
export function createFullProjectLoader(refreshFullProject) {
  const inFlightRef = { current: null }

  return async function loadFullProjectOnce(reason) {
    if (!refreshFullProject) {
      return null
    }

    if (inFlightRef.current) {
      return inFlightRef.current
    }

    inFlightRef.current = (async () => {
      logFullLoadedOnce(reason)
      return refreshFullProject()
    })()

    try {
      return await inFlightRef.current
    } finally {
      inFlightRef.current = null
    }
  }
}
