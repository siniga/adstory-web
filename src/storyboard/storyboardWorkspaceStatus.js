export function getStoryboardSceneStatusLabel(scene) {
  const status = scene?.shotGenerationStatus ?? scene?.shot_generation_status
  if (status === 'failed') return 'Failed'
  if (status === 'queued' || status === 'generating') return 'Generating'
  if (status === 'completed' || (scene?.shotCount ?? 0) > 0) return 'Completed'
  return 'No Shots'
}

export function getStoryboardSceneStatusTone(scene) {
  const label = getStoryboardSceneStatusLabel(scene)
  if (label === 'Failed') return 'failed'
  if (label === 'Generating') return 'generating'
  if (label === 'Completed') return 'completed'
  return 'idle'
}

export function isStoryboardShotGenerationActive(status) {
  return status === 'queued' || status === 'generating'
}

export function shouldStopStoryboardShotPolling(progress) {
  const status = progress?.status
  return status === 'completed' || status === 'failed'
}

export function shouldStopStoryboardShotImagePolling(progress) {
  if (!progress) return false

  const total = progress.total ?? 0
  const completed = progress.completed ?? 0
  const failed = progress.failed ?? 0
  const remaining = progress.remaining ?? 0
  const percent = progress.progress_percent ?? 0

  if (percent >= 100) return true
  if (total > 0 && remaining === 0) return true
  if (total > 0 && completed + failed >= total) return true
  return false
}

export function areAllSceneShotImagesDone(shots = []) {
  if (!shots.length) return false
  return shots.every((shot) => {
    const status = getStoryboardShotImageStatus(shot)
    return status === 'completed' || status === 'failed'
  })
}

/** Resume polling only when generation is actually in progress — not for idle scenes. */
export function shouldResumeStoryboardImagePolling(progress, shots = []) {
  if (!progress || progress.stalled) return false
  if (shouldStopStoryboardShotImagePolling(progress)) return false
  if (areAllSceneShotImagesDone(shots)) return false

  if (shots.some((shot) => isStoryboardShotImageInFlight(shot))) return true

  const completed = progress.completed ?? 0
  const failed = progress.failed ?? 0
  const remaining = progress.remaining ?? 0

  if (remaining > 0 && completed + failed > 0) return true

  const status = progress.status
  if (status === 'queued' || status === 'generating' || status === 'running') return true

  return false
}

export function isStoryboardShotImageGenerationActive(progress) {
  if (!progress || progress.stalled || shouldStopStoryboardShotImagePolling(progress)) return false

  const status = progress.status
  if (status === 'queued' || status === 'generating' || status === 'running') return true
  return (progress.remaining ?? 0) > 0
}

export function getStoryboardShotImageStatus(shot) {
  if (!shot) return 'none'

  const explicit = shot.image_status ?? shot.imageStatus
  if (explicit === 'queued' || explicit === 'generating' || explicit === 'failed') {
    return explicit
  }
  if (explicit === 'completed') return 'completed'

  const imageUrl = shot.image_url ?? shot.imageUrl
  if (imageUrl != null && String(imageUrl).trim()) {
    return 'completed'
  }

  if (explicit) return explicit
  return 'none'
}

export function isStoryboardShotImageInFlight(shot) {
  const status = getStoryboardShotImageStatus(shot)
  return status === 'queued' || status === 'generating'
}

export function areSceneShotImagesSettled(shots = []) {
  if (!shots.length) return true
  return shots.every((shot) => !isStoryboardShotImageInFlight(shot))
}

export function filterShotsForScene(shots = [], sceneId) {
  if (!sceneId || !shots.length) return []
  const sceneKey = String(sceneId)
  return shots.filter(
    (shot) => String(shot.sceneApiId ?? shot.scene_api_id ?? shot.adstory_scene_id ?? '') === sceneKey
  )
}

export function formatStoryboardEstimatedRemaining(seconds) {
  if (seconds == null || seconds <= 0) return '—'
  if (seconds < 60) return `~${Math.ceil(seconds)}s`
  const minutes = Math.ceil(seconds / 60)
  return minutes === 1 ? '~1 min' : `~${minutes} min`
}

export function getStoryboardShotImageBadge(shot) {
  const status = getStoryboardShotImageStatus(shot)
  if (status === 'completed') return { label: 'Completed', tone: 'completed' }
  if (status === 'failed') return { label: 'Failed', tone: 'failed' }
  if (status === 'generating') return { label: 'Generating', tone: 'generating' }
  if (status === 'queued') return { label: 'Queued', tone: 'queued' }
  return null
}

export function getStoryboardShotStatusLabel(shot) {
  const status = shot?.image_status ?? shot?.status
  if (status === 'failed') return 'Failed'
  if (status === 'completed' && shot?.image_url) return 'Completed'
  if (status === 'generating' || status === 'queued') return 'Generating'
  return 'No Image'
}

export function getStoryboardShotStatusTone(shot) {
  const label = getStoryboardShotStatusLabel(shot)
  if (label === 'Failed') return 'failed'
  if (label === 'Generating') return 'generating'
  if (label === 'Completed') return 'completed'
  return 'idle'
}
