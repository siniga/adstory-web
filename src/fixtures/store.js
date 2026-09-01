import { createSeedState } from './seed'

const STORAGE_KEY = 'screenly-fixtures-v1'

function clone(value) {
  return structuredClone(value)
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    const parsed = JSON.parse(raw)
    if (!parsed?.projects || typeof parsed.projects !== 'object') {
      return createSeedState()
    }
    return {
      nextIds: {
        project: 3,
        scene: 100,
        shot: 200,
        character: 300,
        environment: 400,
        image: 500,
        asset: 600,
        ...(parsed.nextIds ?? {}),
      },
      projects: parsed.projects,
    }
  } catch {
    return createSeedState()
  }
}

let state = loadState()

export function persistStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function getState() {
  return state
}

export function resetStore() {
  state = createSeedState()
  persistStore()
  return state
}

export function nextId(kind) {
  const value = state.nextIds[kind] ?? 1000
  state.nextIds[kind] = value + 1
  return value
}

export function listProjects() {
  return Object.values(state.projects).sort((a, b) => {
    const aTime = new Date(a.updated_at || 0).getTime()
    const bTime = new Date(b.updated_at || 0).getTime()
    return bTime - aTime
  })
}

export function getProject(id) {
  const project = state.projects[String(id)] ?? state.projects[Number(id)]
  return project ? clone(project) : null
}

export function getProjectRef(id) {
  return state.projects[String(id)] ?? state.projects[Number(id)] ?? null
}

export function saveProject(project) {
  project.updated_at = new Date().toISOString()
  state.projects[String(project.id)] = project
  persistStore()
  return clone(project)
}

export function deleteProject(id) {
  const key = state.projects[String(id)] ? String(id) : String(Number(id))
  if (!state.projects[key]) return false
  delete state.projects[key]
  persistStore()
  return true
}

export function touch(project) {
  project.updated_at = new Date().toISOString()
  persistStore()
  return project
}
