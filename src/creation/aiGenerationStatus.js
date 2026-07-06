export const PROJECT_GEN_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  STALLED: 'stalled',
  COMPLETED: 'completed',
  COMPLETED_WITH_ERRORS: 'completed_with_errors',
  CANCELLED: 'cancelled',
}

export const GENERATION_STUCK_MS = 60_000

export function isGenerationRunning(status) {
  return status === PROJECT_GEN_STATUS.RUNNING
}

export function isGenerationStalled(status) {
  return status === PROJECT_GEN_STATUS.STALLED
}

export function isGenerationInProgress(status) {
  return (
    status === PROJECT_GEN_STATUS.RUNNING || status === PROJECT_GEN_STATUS.STALLED
  )
}

export function isGenerationTerminal(status) {
  return (
    status === PROJECT_GEN_STATUS.COMPLETED ||
    status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS ||
    status === PROJECT_GEN_STATUS.CANCELLED
  )
}

export function deriveProgressPercent({
  progress_percent,
  completed = 0,
  failed = 0,
  total = 0,
  status = null,
  isComplete = false,
} = {}) {
  if (progress_percent != null && Number.isFinite(Number(progress_percent))) {
    return Math.min(100, Math.max(0, Math.round(Number(progress_percent))))
  }

  if (total <= 0) {
    return isComplete ||
      status === PROJECT_GEN_STATUS.COMPLETED ||
      status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS
      ? 100
      : 0
  }

  if (
    isComplete ||
    status === PROJECT_GEN_STATUS.COMPLETED ||
    status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS
  ) {
    return 100
  }

  const done = (completed ?? 0) + (failed ?? 0)
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)))
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

export function formatEstimatedSecondsRemaining(seconds) {
  if (seconds == null || !Number.isFinite(Number(seconds)) || Number(seconds) <= 0) {
    return null
  }
  return formatEstimatedTimeRemaining(Number(seconds) * 1000)
}

export function estimateTimeRemaining({ completed, total, failed, startedAt }) {
  if (!startedAt || !completed || completed <= 0 || !total) return null

  const elapsed = Date.now() - new Date(startedAt).getTime()
  if (elapsed <= 0) return null

  const remaining = Math.max(0, total - completed - (failed ?? 0))
  if (remaining <= 0) return null

  return (elapsed / completed) * remaining
}

export function normalizeGenerationProgress(progress, { isComplete = false } = {}) {
  if (!progress) return null

  const resolvedStatus =
    isComplete &&
    progress.status !== PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS &&
    (progress.failed ?? 0) === 0
      ? PROJECT_GEN_STATUS.COMPLETED
      : progress.status

  const progressPercent = deriveProgressPercent({
    progress_percent: progress.progress_percent,
    completed: progress.completed,
    failed: progress.failed,
    total: progress.total,
    status: resolvedStatus,
    isComplete,
  })

  return {
    ...progress,
    status: resolvedStatus,
    progress_percent: progressPercent,
    remaining:
      progress.remaining ??
      Math.max(0, (progress.total ?? 0) - (progress.completed ?? 0) - (progress.failed ?? 0)),
  }
}

function progressSnapshot(progress) {
  if (!progress) return null

  return {
    status: progress.status ?? null,
    completed: progress.completed ?? 0,
    failed: progress.failed ?? 0,
    total: progress.total ?? 0,
    currentSceneId: progress.currentScene?.id ?? null,
    currentSceneStatus:
      progress.currentScene?.status ?? progress.currentScene?.shot_generation_status ?? null,
  }
}

export function createGenerationStuckTracker() {
  return {
    lastSnapshot: null,
    lastChangedAt: Date.now(),
    queuedSceneKey: null,
    queuedSince: null,
  }
}

export function evaluateGenerationStuck(progress, tracker, now = Date.now()) {
  if (!progress || !tracker) return false

  if (progress.status === PROJECT_GEN_STATUS.STALLED || progress.stalled) {
    return true
  }

  if (!isGenerationRunning(progress.status)) {
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
  const queuedKey = currentScene?.id ?? currentScene?.scene_number ?? null
  const queuedStatus =
    currentScene?.status === 'queued' ||
    currentScene?.shot_generation_status === 'queued'

  if (queuedStatus && queuedKey != null) {
    if (tracker.queuedSceneKey !== queuedKey) {
      tracker.queuedSceneKey = queuedKey
      tracker.queuedSince = now
    }
  } else {
    tracker.queuedSceneKey = null
    tracker.queuedSince = null
  }

  if (tracker.queuedSince && queuedStatus && now - tracker.queuedSince >= GENERATION_STUCK_MS) {
    return true
  }

  return now - tracker.lastChangedAt >= GENERATION_STUCK_MS
}

export function resetGenerationStuckTracker(tracker) {
  if (!tracker) return

  tracker.lastSnapshot = null
  tracker.lastChangedAt = Date.now()
  tracker.queuedSceneKey = null
  tracker.queuedSince = null
}
