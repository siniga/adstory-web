import { mergeCharacterListsPreservingPortraits } from '../creation/characterGenerationStatus'
import { mergeEnvironmentListsPreservingImages } from '../creation/environmentGenerationStatus'

export function logProjectStore(message, detail) {
  if (detail !== undefined) {
    console.log(`[ProjectStore] ${message}`, detail)
  } else {
    console.log(`[ProjectStore] ${message}`)
  }
}

export function logBlockedOverwrite(message, detail) {
  console.log(`[Blocked overwrite] ${message}`, detail ?? '')
}

/**
 * Refuses to replace a non-empty list with an empty one unless explicitly allowed.
 */
export function guardArrayReplace(resource, current = [], incoming = [], { allowEmpty = false } = {}) {
  const currentLen = Array.isArray(current) ? current.length : 0
  const incomingLen = Array.isArray(incoming) ? incoming.length : 0

  if (!allowEmpty && currentLen > 0 && incomingLen === 0) {
    logBlockedOverwrite(`tried to replace completed ${resource} with empty array`, {
      currentCount: currentLen,
    })
    return { blocked: true, value: current }
  }

  return { blocked: false, value: incoming }
}

export function mergeCharactersSafe(current = [], incoming = []) {
  if (!incoming.length) {
    return current
  }
  const merged = mergeCharacterListsPreservingPortraits(current, incoming)
  logProjectStore('characters merged', { count: merged.length })
  return merged
}

export function mergeEnvironmentsSafe(current = [], incoming = []) {
  if (!incoming.length) {
    return current
  }
  const merged = mergeEnvironmentListsPreservingImages(current, incoming)
  logProjectStore('environments merged', { count: merged.length })
  return merged
}
