export const SHOT_IMAGE_STATUS = {
  PENDING: 'pending',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

export const SCENE_IMAGE_STATUS = {
  NOT_GENERATED: 'not_generated',
  GENERATING: 'generating',
  COMPLETE: 'complete',
  SOME_FAILED: 'some_failed',
}

export function normalizeImageStatus(value, previewImage) {
  if (Object.values(SHOT_IMAGE_STATUS).includes(value)) {
    if (value === SHOT_IMAGE_STATUS.PENDING && previewImage) {
      return SHOT_IMAGE_STATUS.COMPLETED
    }
    return value
  }
  if (previewImage) {
    return SHOT_IMAGE_STATUS.COMPLETED
  }
  return SHOT_IMAGE_STATUS.PENDING
}

export function resolveShotImageStatus(shot, options = {}) {
  const { isRegenerating = false, isSceneGenerating = false } = options
  const storedStatus = normalizeImageStatus(shot?.imageStatus, shot?.previewImage)

  if (isRegenerating) {
    return SHOT_IMAGE_STATUS.GENERATING
  }

  if (
    isSceneGenerating &&
    storedStatus !== SHOT_IMAGE_STATUS.COMPLETED &&
    storedStatus !== SHOT_IMAGE_STATUS.FAILED
  ) {
    return SHOT_IMAGE_STATUS.GENERATING
  }

  return storedStatus
}

export function getShotStatusBadgeLabel(status) {
  switch (status) {
    case SHOT_IMAGE_STATUS.GENERATING:
      return 'Generating'
    case SHOT_IMAGE_STATUS.COMPLETED:
      return 'Done'
    case SHOT_IMAGE_STATUS.FAILED:
      return 'Failed'
    default:
      return 'Pending'
  }
}

export function getSceneImageStatus(scene, options = {}) {
  const { isSceneGenerating = false } = options
  const shots = scene?.shots ?? []

  if (isSceneGenerating) {
    return SCENE_IMAGE_STATUS.GENERATING
  }

  if (!shots.length) {
    return SCENE_IMAGE_STATUS.NOT_GENERATED
  }

  const resolved = shots.map((shot) => resolveShotImageStatus(shot))
  const failedCount = resolved.filter((status) => status === SHOT_IMAGE_STATUS.FAILED).length
  const doneCount = resolved.filter((status) => status === SHOT_IMAGE_STATUS.COMPLETED).length
  const generatingCount = resolved.filter((status) => status === SHOT_IMAGE_STATUS.GENERATING).length

  if (generatingCount > 0) {
    return SCENE_IMAGE_STATUS.GENERATING
  }
  if (failedCount > 0) {
    return SCENE_IMAGE_STATUS.SOME_FAILED
  }
  if (doneCount === shots.length) {
    return SCENE_IMAGE_STATUS.COMPLETE
  }

  return SCENE_IMAGE_STATUS.NOT_GENERATED
}

export function getSceneStatusBadgeLabel(status) {
  switch (status) {
    case SCENE_IMAGE_STATUS.GENERATING:
      return 'Generating'
    case SCENE_IMAGE_STATUS.COMPLETE:
      return 'Complete'
    case SCENE_IMAGE_STATUS.SOME_FAILED:
      return 'Some failed'
    default:
      return 'Not generated'
  }
}

export function canRegenerateShotImage(shot, options = {}) {
  const { isRegenerating = false, isSceneGenerating = false } = options
  if (isRegenerating || isSceneGenerating) {
    return false
  }

  const status = resolveShotImageStatus(shot, options)
  return (
    Boolean(shot?.apiId) &&
    (status === SHOT_IMAGE_STATUS.FAILED || status === SHOT_IMAGE_STATUS.COMPLETED)
  )
}

export function getRegenerateBlockedReason(shot, scene, options = {}) {
  const { isRegenerating = false, isSceneGenerating = false } = options

  if (isRegenerating) {
    return null
  }

  if (!shot?.apiId) {
    return 'Shot is not saved yet'
  }

  if (isSceneGenerating) {
    return 'Scene generation still in progress'
  }

  const status = resolveShotImageStatus(shot, options)

  switch (status) {
    case SHOT_IMAGE_STATUS.GENERATING:
      return 'Waiting for image generation'
    case SHOT_IMAGE_STATUS.PENDING:
      return 'Shot image not completed'
    case SHOT_IMAGE_STATUS.COMPLETED:
    case SHOT_IMAGE_STATUS.FAILED:
      return null
    default:
      return 'Regeneration unavailable'
  }
}

export function isSceneGenerating(generatingSceneIds, sceneApiId) {
  return Boolean(generatingSceneIds?.[String(sceneApiId)])
}
