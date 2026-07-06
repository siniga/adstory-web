import {
  createEmptyProject,
  LEGACY_PROJECT_STORAGE_KEY,
  PROJECT_STORAGE_KEY,
} from './projectModel'

export function loadProject() {
  try {
    let raw = localStorage.getItem(PROJECT_STORAGE_KEY)
    if (!raw) {
      raw = localStorage.getItem(LEGACY_PROJECT_STORAGE_KEY)
      if (raw) {
        localStorage.setItem(PROJECT_STORAGE_KEY, raw)
        localStorage.removeItem(LEGACY_PROJECT_STORAGE_KEY)
      }
    }
    if (!raw) return createEmptyProject()
    const parsed = JSON.parse(raw)
    return { ...createEmptyProject(), ...parsed }
  } catch {
    return createEmptyProject()
  }
}

export function saveProject(project) {
  const payload = { ...project, updatedAt: Date.now() }
  localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(payload))
  return payload
}

export function clearStoredProject() {
  localStorage.removeItem(PROJECT_STORAGE_KEY)
  localStorage.removeItem(LEGACY_PROJECT_STORAGE_KEY)
}
