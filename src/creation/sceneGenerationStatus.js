export const PROJECT_SCENE_GEN_STATUS = {
  RUNNING: 'running',
  STALLED: 'stalled',
  COMPLETED: 'completed',
  COMPLETED_WITH_ERRORS: 'completed_with_errors',
  CANCELLED: 'cancelled',
}

export const SCENE_GENERATION_STUCK_MS = 60_000

export const SCENE_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

export function shouldAutoStartSceneGeneration(status, { scenes = [] } = {}) {
  if (scenes.length > 0) return false
  if (
    status === PROJECT_SCENE_GEN_STATUS.COMPLETED ||
    status === PROJECT_SCENE_GEN_STATUS.COMPLETED_WITH_ERRORS ||
    status === PROJECT_SCENE_GEN_STATUS.CANCELLED
  ) {
    return false
  }
  if (status == null || status === '') return true
  return status === 'pending' || status === 'failed'
}

export function isSceneGenerationRunning(status) {
  return status === PROJECT_SCENE_GEN_STATUS.RUNNING
}

export function isSceneGenerationStalled(status) {
  return status === PROJECT_SCENE_GEN_STATUS.STALLED
}

export function isSceneGenerationInProgress(status) {
  return (
    status === PROJECT_SCENE_GEN_STATUS.RUNNING ||
    status === PROJECT_SCENE_GEN_STATUS.STALLED
  )
}

export function isSceneGenerationTerminal(status) {
  return (
    status === PROJECT_SCENE_GEN_STATUS.COMPLETED ||
    status === PROJECT_SCENE_GEN_STATUS.COMPLETED_WITH_ERRORS ||
    status === PROJECT_SCENE_GEN_STATUS.CANCELLED
  )
}

export function isSceneGenerationActive(status) {
  return isSceneGenerationRunning(status) || shouldAutoStartSceneGeneration(status)
}

export function isSceneEditable(scene) {
  return scene?.status === SCENE_STATUS.COMPLETED
}

export function getSceneStatusLabel(status) {
  switch (status) {
    case SCENE_STATUS.PENDING:
      return 'Pending'
    case SCENE_STATUS.QUEUED:
      return 'Queued'
    case SCENE_STATUS.GENERATING:
      return 'Generating'
    case SCENE_STATUS.COMPLETED:
      return 'Completed'
    case SCENE_STATUS.FAILED:
      return 'Failed'
    default:
      return status ? String(status) : 'Unknown'
  }
}

const SCENE_STATUS_RANK = {
  [SCENE_STATUS.PENDING]: 0,
  [SCENE_STATUS.QUEUED]: 1,
  [SCENE_STATUS.GENERATING]: 2,
  [SCENE_STATUS.FAILED]: 3,
  [SCENE_STATUS.COMPLETED]: 4,
}

export function sceneStatusRank(status) {
  if (status == null || status === '') return -1
  return SCENE_STATUS_RANK[status] ?? -1
}

export function pickPreferredSceneStatus(existingStatus, incomingStatus) {
  const existingRank = sceneStatusRank(existingStatus)
  const incomingRank = sceneStatusRank(incomingStatus)

  if (incomingRank > existingRank) return incomingStatus
  if (existingRank > incomingRank) return existingStatus
  return incomingStatus ?? existingStatus ?? null
}

export function mergeSceneRecord(existing, incoming) {
  if (!existing) return incoming
  if (!incoming) return existing

  const existingRank = sceneStatusRank(existing.status)
  const incomingRank = sceneStatusRank(incoming.status)

  if (
    existing.status === SCENE_STATUS.COMPLETED &&
    incomingRank >= 0 &&
    incomingRank < existingRank
  ) {
    console.log('[Scenes] ignored stale pending status for completed scene', existing.id)
    return {
      ...existing,
      thumbGradient: existing.thumbGradient ?? incoming.thumbGradient,
    }
  }

  const status = pickPreferredSceneStatus(existing.status, incoming.status)
  const incomingAuthoritative = incomingRank >= existingRank
  const base = incomingAuthoritative ? incoming : existing
  const supplemental = incomingAuthoritative ? existing : incoming

  return {
    ...supplemental,
    ...base,
    status,
    generation_error: incoming.generation_error ?? existing.generation_error ?? null,
    generated_at: incoming.generated_at ?? existing.generated_at ?? null,
    thumbGradient: existing.thumbGradient ?? incoming.thumbGradient,
  }
}

export function mergeProgressScenes(current = [], incoming = []) {
  if (!incoming.length) return current

  return incoming.map((incomingScene) => {
    const existing = current.find(
      (scene) =>
        (incomingScene.apiId != null && String(scene.apiId) === String(incomingScene.apiId)) ||
        scene.id === incomingScene.id
    )

    return mergeSceneRecord(existing, incomingScene)
  })
}

export function mergeScenesWithPriority({
  fullProjectScenes = [],
  progressScenes = [],
  localScenes = [],
  fallbackScenes = [],
} = {}) {
  const primary =
    fullProjectScenes.length > 0
      ? fullProjectScenes
      : progressScenes.length > 0
        ? progressScenes
        : localScenes.length > 0
          ? localScenes
          : fallbackScenes

  if (!primary.length) return []

  let merged = primary
  if (fullProjectScenes.length) {
    merged = mergeProgressScenes(merged, fullProjectScenes)
  }
  if (progressScenes.length) {
    merged = mergeProgressScenes(merged, progressScenes)
  }

  if (localScenes.length) {
    if (!fullProjectScenes.length && !progressScenes.length) {
      merged = mergeProgressScenes(merged, localScenes)
    } else {
      merged = merged.map((scene) => {
        const local = localScenes.find(
          (item) =>
            (scene.apiId != null && String(item.apiId) === String(scene.apiId)) ||
            item.id === scene.id
        )
        if (!local) return scene
        return {
          ...scene,
          thumbGradient: local.thumbGradient ?? scene.thumbGradient,
        }
      })
    }
  }

  return merged
}

export function deriveProgressCountsFromScenes(scenes = []) {
  const total = scenes.length
  const completed = scenes.filter((scene) => scene.status === SCENE_STATUS.COMPLETED).length
  const failed = scenes.filter((scene) => isSceneFailed(scene)).length
  const remaining = Math.max(0, total - completed - failed)

  return { total, completed, failed, remaining }
}

export function deriveProgressPercent({
  progress_percent,
  completed = 0,
  failed = 0,
  total = 0,
  status = null,
  scenes = [],
} = {}) {
  if (progress_percent != null && Number.isFinite(Number(progress_percent))) {
    return Math.min(100, Math.max(0, Math.round(Number(progress_percent))))
  }

  const sceneTotal = total || scenes.length
  if (sceneTotal <= 0) {
    return status === PROJECT_SCENE_GEN_STATUS.COMPLETED ||
      status === PROJECT_SCENE_GEN_STATUS.COMPLETED_WITH_ERRORS
      ? 100
      : 0
  }

  if (allScenesCompleted(scenes)) {
    return 100
  }

  if (
    status === PROJECT_SCENE_GEN_STATUS.COMPLETED ||
    status === PROJECT_SCENE_GEN_STATUS.COMPLETED_WITH_ERRORS
  ) {
    return 100
  }

  const done = (completed ?? 0) + (failed ?? 0)
  return Math.min(100, Math.max(0, Math.round((done / sceneTotal) * 100)))
}

export function normalizeSceneGenerationProgress(progress, scenes = []) {
  if (!progress) return null

  const sceneCounts = deriveProgressCountsFromScenes(scenes)
  const shouldUseSceneCounts =
    scenes.length > 0 &&
    (isSceneGenerationTerminal(progress.status) ||
      allScenesCompleted(scenes) ||
      (progress.completed ?? 0) < sceneCounts.completed ||
      ((progress.total ?? 0) > 0 && sceneCounts.total >= (progress.total ?? 0)))

  const merged = shouldUseSceneCounts
    ? {
        ...progress,
        total: Math.max(progress.total ?? 0, sceneCounts.total),
        completed: sceneCounts.completed,
        failed: sceneCounts.failed,
        remaining: sceneCounts.remaining,
      }
    : progress

  const resolvedStatus =
    allScenesCompleted(scenes) &&
    merged.status !== PROJECT_SCENE_GEN_STATUS.COMPLETED_WITH_ERRORS &&
    sceneCounts.failed === 0
      ? PROJECT_SCENE_GEN_STATUS.COMPLETED
      : merged.status

  const progressPercent = deriveProgressPercent({
    progress_percent: merged.progress_percent,
    completed: merged.completed,
    failed: merged.failed,
    total: merged.total,
    status: resolvedStatus,
    scenes,
  })

  return {
    ...merged,
    status: resolvedStatus,
    progress_percent: progressPercent,
    remaining:
      merged.remaining ??
      Math.max(0, (merged.total ?? 0) - (merged.completed ?? 0) - (merged.failed ?? 0)),
  }
}

export function formatEstimatedTimeRemaining(ms) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null

  const totalSeconds = Math.ceil(ms / 1000)
  if (totalSeconds < 60) return 'Less than a minute remaining'

  const minutes = Math.ceil(totalSeconds / 60)
  if (minutes === 1) return 'About 1 minute remaining'
  if (minutes < 60) return `About ${minutes} minutes remaining`

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return hours === 1 ? 'About 1 hour remaining' : `About ${hours} hours remaining`
  }
  return `About ${hours}h ${remainingMinutes}m remaining`
}

export function estimateTimeRemaining({ completed, total, failed, startedAt }) {
  if (!startedAt || !completed || completed <= 0 || !total) return null

  const elapsed = Date.now() - new Date(startedAt).getTime()
  if (elapsed <= 0) return null

  const remaining = Math.max(0, total - completed - (failed ?? 0))
  if (remaining <= 0) return null

  return (elapsed / completed) * remaining
}

export function allScenesCompleted(scenes = []) {
  return scenes.length > 0 && scenes.every((scene) => scene.status === SCENE_STATUS.COMPLETED)
}

export function allScenesFinished(scenes = []) {
  return (
    scenes.length > 0 &&
    scenes.every(
      (scene) =>
        scene.status === SCENE_STATUS.COMPLETED ||
        scene.status === SCENE_STATUS.FAILED ||
        Boolean(String(scene.generation_error ?? '').trim())
    )
  )
}

export function shouldStopScenePolling(progress, scenes = []) {
  if (progress && isSceneGenerationTerminal(progress.status)) {
    return true
  }
  return allScenesFinished(scenes) || allScenesCompleted(scenes)
}

export function hasFailedScenes(scenes = []) {
  return scenes.some(
    (scene) =>
      scene.status === SCENE_STATUS.FAILED || Boolean(String(scene.generation_error ?? '').trim())
  )
}

export function isSceneFailed(scene) {
  if (!scene) return false
  return (
    scene.status === SCENE_STATUS.FAILED || Boolean(String(scene.generation_error ?? '').trim())
  )
}

export function shouldShowSceneGenerationRecovery(progress, { isStuck = false } = {}) {
  if (!progress) return false

  const status = progress.status ?? null
  const failed = progress.failed ?? 0

  if (isStuck || status === PROJECT_SCENE_GEN_STATUS.STALLED || progress.stalled) {
    return true
  }

  if (failed > 0 && isSceneGenerationTerminal(status)) {
    return true
  }

  return false
}

function progressSnapshot(progress) {
  if (!progress) return null

  return {
    status: progress.status ?? null,
    completed: progress.completed ?? 0,
    failed: progress.failed ?? 0,
    total: progress.total ?? 0,
    currentSceneId: progress.currentScene?.id ?? null,
    currentSceneStatus: progress.currentScene?.status ?? null,
  }
}

export function createSceneGenerationStuckTracker() {
  return {
    lastSnapshot: null,
    lastChangedAt: Date.now(),
    queuedSceneKey: null,
    queuedSince: null,
  }
}

export function evaluateSceneGenerationStuck(progress, tracker, now = Date.now()) {
  if (!progress || !tracker) return false

  if (progress.status === PROJECT_SCENE_GEN_STATUS.STALLED || progress.stalled) {
    return true
  }

  if (!isSceneGenerationRunning(progress.status)) {
    return false
  }

  const total = progress.total ?? 0
  const completed = progress.completed ?? 0
  const failed = progress.failed ?? 0
  if (total > 0 && completed + failed >= total) {
    return false
  }

  const snapshot = progressSnapshot(progress)
  const snapshotKey = JSON.stringify(snapshot)
  const previousKey = tracker.lastSnapshot ? JSON.stringify(tracker.lastSnapshot) : null

  if (snapshotKey !== previousKey) {
    tracker.lastSnapshot = snapshot
    tracker.lastChangedAt = now
  }

  const currentScene = progress.currentScene
  const queuedKey =
    currentScene?.id ?? currentScene?.scene_number ?? null

  if (currentScene?.status === SCENE_STATUS.QUEUED && queuedKey != null) {
    if (tracker.queuedSceneKey !== queuedKey) {
      tracker.queuedSceneKey = queuedKey
      tracker.queuedSince = now
    }
  } else {
    tracker.queuedSceneKey = null
    tracker.queuedSince = null
  }

  if (
    tracker.queuedSince &&
    currentScene?.status === SCENE_STATUS.QUEUED &&
    now - tracker.queuedSince >= SCENE_GENERATION_STUCK_MS
  ) {
    return true
  }

  return now - tracker.lastChangedAt >= SCENE_GENERATION_STUCK_MS
}

export function resetSceneGenerationStuckTracker(tracker) {
  if (!tracker) return

  tracker.lastSnapshot = null
  tracker.lastChangedAt = Date.now()
  tracker.queuedSceneKey = null
  tracker.queuedSince = null
}
