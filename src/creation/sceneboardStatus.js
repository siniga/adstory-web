import { isGenerationInProgress, isGenerationTerminal, PROJECT_GEN_STATUS } from './aiGenerationStatus'
import { SCENE_STATUS } from './sceneGenerationStatus'

export function mapSceneboardScene(scene = {}) {
  return {
    id: scene.scene_number ?? scene.id ?? null,
    apiId: scene.id ?? scene.apiId ?? null,
    scene_number: scene.scene_number ?? scene.id ?? null,
    order_index: scene.order_index ?? 0,
    title: scene.title ?? '',
    location: scene.location ?? '',
    time_of_day: scene.time_of_day ?? '',
    description: scene.description ?? '',
    mood: scene.mood ?? '',
    visual_style: scene.visual_style ?? '',
    characters: Array.isArray(scene.characters) ? [...scene.characters] : [],
    environment: scene.environment ?? '',
    shotCount: scene.shot_count ?? scene.shots_count ?? scene.shotCount ?? 0,
    shotGenerationStatus:
      scene.shot_generation_status ?? scene.shotGenerationStatus ?? null,
    shotGenerationError:
      scene.shot_generation_error ?? scene.shotGenerationError ?? null,
    estimatedDuration: scene.estimated_duration ?? scene.estimatedDuration ?? null,
    aiNotes: scene.ai_notes ?? scene.aiNotes ?? '',
    status: scene.status ?? null,
  }
}

export function mapSceneboardScenes(scenes = []) {
  return [...scenes]
    .sort(
      (a, b) =>
        (a.order_index ?? 0) - (b.order_index ?? 0) ||
        (a.scene_number ?? 0) - (b.scene_number ?? 0)
    )
    .map(mapSceneboardScene)
}

export function getSceneShotStatusLabel(scene) {
  const status = scene?.shotGenerationStatus ?? scene?.shot_generation_status
  if (status === 'failed') return 'Failed'
  if (
    status === 'queued' ||
    status === 'generating' ||
    isGenerationInProgress(status)
  ) {
    return 'Generating'
  }
  if (status === 'completed') return 'Completed'
  if ((scene?.shotCount ?? 0) > 0 || (scene?.shots?.length ?? 0) > 0) return 'Completed'
  return 'No Shots'
}

export function getSceneShotStatusTone(scene) {
  const label = getSceneShotStatusLabel(scene)
  if (label === 'Failed') return 'failed'
  if (label === 'Generating') return 'generating'
  if (label === 'Completed') return 'completed'
  return 'idle'
}

export function getSceneGenerationSidebarStatus(scene) {
  const status = scene?.status ?? null

  switch (status) {
    case 'queued':
      return { label: 'Queued', tone: 'generating' }
    case 'generating':
      return { label: 'Generating', tone: 'generating' }
    case 'completed':
      return { label: 'Ready', tone: 'completed' }
    case 'failed':
      return { label: 'Failed', tone: 'failed' }
    case 'pending':
      return { label: 'Pending', tone: 'idle' }
    default:
      return { label: 'Pending', tone: 'idle' }
  }
}

export function areSceneboardScenesGenerationSettled(scenes = []) {
  if (!scenes.length) return false

  return scenes.every((scene) => {
    const status = scene?.status ?? null
    if (status == null || status === '') return true
    return status === SCENE_STATUS.COMPLETED || status === SCENE_STATUS.FAILED
  })
}

export function getSceneboardSidebarStatus(scene) {
  const status = scene?.status ?? null

  switch (status) {
    case 'failed':
      return { label: 'Failed', tone: 'failed' }
    case 'generating':
    case 'queued':
      return { label: 'Generating', tone: 'generating' }
    case 'completed':
      return { label: 'Ready', tone: 'completed' }
    default:
      return { label: 'Ready', tone: 'completed' }
  }
}

export function getSidebarSceneStatus(scene, { sceneGenerationActive = false } = {}) {
  if (sceneGenerationActive) {
    return getSceneGenerationSidebarStatus(scene)
  }

  return getSceneboardSidebarStatus(scene)
}

export function getShotItemStatusLabel(shot) {
  const status = shot?.generation_status ?? shot?.generationStatus ?? shot?.status
  if (status === 'failed') return 'Failed'
  if (status === 'generating') return 'Generating'
  if (status === 'queued' || status === 'pending') return 'Queued'
  if (status === 'completed' || status === 'ready') return 'Ready'
  if (shot?.title || shot?.shotSize || shot?.cameraAngle) return 'Ready'
  return 'Queued'
}

export function isSceneShotGenerationActive(scene) {
  const status = scene?.shotGenerationStatus ?? scene?.shot_generation_status
  return (
    status === 'queued' ||
    status === 'generating' ||
    isGenerationInProgress(status)
  )
}

export function isSceneShotGenerationFailed(scene) {
  const status = scene?.shotGenerationStatus ?? scene?.shot_generation_status
  return status === 'failed'
}

export function isSceneShotGenerationComplete(scene) {
  const status = scene?.shotGenerationStatus ?? scene?.shot_generation_status
  if (status === 'completed') return true
  if (isSceneShotGenerationActive(scene)) return false
  return (scene?.shotCount ?? 0) > 0
}

export function shouldStopSceneShotPolling(progress, scene) {
  const status =
    progress?.status ??
    scene?.shotGenerationStatus ??
    scene?.shot_generation_status ??
    null

  if (status === 'failed') {
    return true
  }

  if (isGenerationTerminal(status)) {
    return true
  }

  if (status === 'completed' || status === 'completed_with_errors') {
    return true
  }

  if (progress?.progress_percent >= 100) {
    return true
  }

  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const failed = progress?.failed ?? 0

  if (total > 0 && completed + failed >= total) {
    return true
  }

  return isSceneShotGenerationComplete(scene) && !isSceneShotGenerationActive(scene)
}

export function formatSceneShotGenerationStatus(scene, progressStatus) {
  const status =
    scene?.shotGenerationStatus ??
    scene?.shot_generation_status ??
    progressStatus ??
    null

  if (status === 'queued') return 'Queued'
  if (status === 'generating' || status === PROJECT_GEN_STATUS.RUNNING) return 'Generating'
  if (status === 'failed' || status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS) return 'Failed'
  if (status === 'completed' || status === PROJECT_GEN_STATUS.COMPLETED) return 'Completed'
  if (isGenerationInProgress(status)) return 'Generating'
  return 'Idle'
}

export function allScenesShotsComplete(scenes = []) {
  if (!scenes.length) return false
  return scenes.every((scene) => getSceneShotStatusLabel(scene) === 'Completed')
}

export function mergeSceneboardShots(existing = [], incoming = []) {
  if (!incoming.length) return existing

  const byKey = new Map(
    existing.map((shot) => [String(shot.apiId ?? shot.id), shot])
  )

  for (const shot of incoming) {
    const key = String(shot.apiId ?? shot.id)
    byKey.set(key, byKey.has(key) ? { ...byKey.get(key), ...shot } : shot)
  }

  return [...byKey.values()].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  )
}

export function mergeScenePreservingShotMeta(incoming, existing) {
  if (!incoming) return existing ?? null
  if (!existing) return incoming

  return {
    ...incoming,
    shotCount: incoming.shotCount ?? existing.shotCount ?? 0,
    shotGenerationStatus:
      incoming.shotGenerationStatus ?? existing.shotGenerationStatus ?? null,
    shotGenerationError:
      incoming.shotGenerationError ?? existing.shotGenerationError ?? null,
  }
}

export function mergeSceneboardSceneLists(freshScenes = [], previousScenes = []) {
  const previousByApiId = new Map(
    previousScenes.map((scene) => [String(scene.apiId), scene])
  )

  return freshScenes.map((fresh) => {
    const previous = previousByApiId.get(String(fresh.apiId))
    if (!previous) return fresh
    return mergeScenePreservingShotMeta(fresh, previous)
  })
}

export function progressSceneToSceneboard(scene = {}) {
  return mapSceneboardScene({
    ...scene,
    id: scene.apiId ?? scene.id,
    shot_count: scene.shotCount ?? 0,
    shot_generation_status: scene.shotGenerationStatus ?? scene.shot_generation_status ?? null,
    shot_generation_error: scene.shotGenerationError ?? scene.shot_generation_error ?? null,
  })
}

export function patchSceneboardScenesFromProgress(current = [], incoming = []) {
  const normalizedIncoming = incoming.map(progressSceneToSceneboard)
  if (!normalizedIncoming.length) return current
  if (!current.length) return normalizedIncoming

  if (normalizedIncoming.length >= current.length) {
    return mergeSceneboardSceneLists(normalizedIncoming, current)
  }

  const incomingByApiId = new Map(
    normalizedIncoming.map((scene) => [String(scene.apiId), scene])
  )

  const patched = current.map((existing) => {
    const update = incomingByApiId.get(String(existing.apiId))
    return update ? mergeScenePreservingShotMeta(update, existing) : existing
  })

  normalizedIncoming.forEach((incomingScene) => {
    const exists = patched.some(
      (scene) => String(scene.apiId) === String(incomingScene.apiId)
    )
    if (!exists) patched.push(incomingScene)
  })

  return patched.sort(
    (a, b) =>
      (a.order_index ?? 0) - (b.order_index ?? 0) ||
      (a.scene_number ?? 0) - (b.scene_number ?? 0)
  )
}

export function findNearestSceneAfterDelete(remainingScenes, oldScenes, deletedSceneId) {
  if (!remainingScenes.length) return null

  const deletedIndex = oldScenes.findIndex(
    (scene) => String(scene.apiId) === String(deletedSceneId)
  )

  if (deletedIndex < 0) {
    return remainingScenes[0]?.apiId ?? null
  }

  const nextIndex = Math.min(deletedIndex, remainingScenes.length - 1)
  return remainingScenes[nextIndex]?.apiId ?? remainingScenes[0]?.apiId ?? null
}

export function mergeSceneInList(scenes, nextScene) {
  if (!nextScene?.apiId) return scenes

  return scenes.map((scene) =>
    String(scene.apiId) === String(nextScene.apiId)
      ? mergeScenePreservingShotMeta(nextScene, scene)
      : scene
  )
}

export function mapSceneShotProgress(data = {}, scene = null) {
  const mappedScene = data.scene ? mapSceneboardScene(data.scene) : scene
  const total = data.total ?? data.total_shots ?? 0
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0

  const currentShot =
    data.current_shot ??
    (data.shots ?? []).find(
      (shot) =>
        shot.generation_status === 'generating' ||
        shot.status === 'generating'
    ) ??
    null

  return {
    status:
      mappedScene?.shotGenerationStatus ??
      data.status ??
      (shouldStopSceneShotPolling(data, mappedScene)
        ? failed > 0
          ? PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS
          : PROJECT_GEN_STATUS.COMPLETED
        : isSceneShotGenerationActive(mappedScene)
          ? PROJECT_GEN_STATUS.RUNNING
          : PROJECT_GEN_STATUS.IDLE),
    total,
    completed,
    failed,
    remaining: data.remaining ?? Math.max(0, total - completed - failed),
    progress_percent: data.progress_percent ?? null,
    estimated_remaining_seconds:
      data.estimated_remaining ?? data.estimated_remaining_seconds ?? null,
    currentShot,
    scene: mappedScene,
    started: data.started ?? null,
  }
}
