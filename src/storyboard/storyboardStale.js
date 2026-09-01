const GENERATED_PREFIX = 'screenly:storyboard-generated:'
const STALE_PREFIX = 'screenly:storyboard-stale:'
const CHANGE_EVENT = 'screenly-storyboard-stale'

function storageKey(prefix, projectId) {
  return `${prefix}${projectId}`
}

function readFlag(prefix, projectId) {
  if (projectId == null || projectId === '') return false
  try {
    return window.localStorage.getItem(storageKey(prefix, projectId)) === '1'
  } catch {
    return false
  }
}

function writeFlag(prefix, projectId, value) {
  if (projectId == null || projectId === '') return
  try {
    const key = storageKey(prefix, projectId)
    if (value) {
      window.localStorage.setItem(key, '1')
    } else {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
  emitChange(projectId)
}

function emitChange(projectId) {
  try {
    window.dispatchEvent(
      new CustomEvent(CHANGE_EVENT, {
        detail: { projectId: projectId == null ? null : String(projectId) },
      })
    )
  } catch {
    // Ignore environments without window events.
  }
}

export function hasGeneratedStoryboard(projectId) {
  return readFlag(GENERATED_PREFIX, projectId)
}

export function markStoryboardGenerated(projectId) {
  if (hasGeneratedStoryboard(projectId)) return
  writeFlag(GENERATED_PREFIX, projectId, true)
}

export function markStoryboardStale(projectId) {
  if (!hasGeneratedStoryboard(projectId)) return
  if (isStoryboardStale(projectId)) return
  writeFlag(STALE_PREFIX, projectId, true)
}

export function clearStoryboardStale(projectId) {
  if (!isStoryboardStale(projectId)) return
  writeFlag(STALE_PREFIX, projectId, false)
}

export function isStoryboardStale(projectId) {
  return readFlag(STALE_PREFIX, projectId)
}

export function scenesHaveStoryboardOutput(scenes = []) {
  return scenes.some(
    (scene) =>
      (scene.shotCount ?? scene.shot_count ?? scene.shots_count ?? 0) > 0 ||
      (scene.shots?.length ?? 0) > 0
  )
}

export function syncStoryboardGeneratedFromScenes(projectId, scenes = []) {
  if (scenesHaveStoryboardOutput(scenes)) {
    markStoryboardGenerated(projectId)
  }
}

export function syncStoryboardGeneratedFromProject(projectId, project = {}) {
  if ((project.shotGroups?.length ?? 0) > 0 || (project.studioScenes?.length ?? 0) > 0) {
    markStoryboardGenerated(projectId)
    return
  }
  syncStoryboardGeneratedFromScenes(projectId, project.scenes ?? [])
}

export function subscribeStoryboardStale(projectId, onChange) {
  const sync = (event) => {
    const changedId = event?.detail?.projectId
    if (changedId != null && projectId != null && String(changedId) !== String(projectId)) {
      return
    }
    onChange(isStoryboardStale(projectId))
  }

  const onStorage = (event) => {
    if (!event.key) {
      onChange(isStoryboardStale(projectId))
      return
    }
    if (event.key === storageKey(STALE_PREFIX, projectId)) {
      onChange(event.newValue === '1')
    }
  }

  window.addEventListener(CHANGE_EVENT, sync)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, sync)
    window.removeEventListener('storage', onStorage)
  }
}
