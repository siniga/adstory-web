import {
  isGenerationTerminal,
  normalizeGenerationProgress,
  PROJECT_GEN_STATUS,
} from './aiGenerationStatus'

export const ENVIRONMENT_IMAGE_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

const IMAGE_STATUS_RANK = {
  [ENVIRONMENT_IMAGE_STATUS.PENDING]: 0,
  [ENVIRONMENT_IMAGE_STATUS.QUEUED]: 1,
  [ENVIRONMENT_IMAGE_STATUS.GENERATING]: 2,
  [ENVIRONMENT_IMAGE_STATUS.FAILED]: 3,
  [ENVIRONMENT_IMAGE_STATUS.COMPLETED]: 4,
}

export function environmentImageStatusRank(status) {
  if (status == null || status === '') return -1
  return IMAGE_STATUS_RANK[status] ?? -1
}

export function pickPreferredEnvironmentImageStatus(existingStatus, incomingStatus) {
  const existingRank = environmentImageStatusRank(existingStatus)
  const incomingRank = environmentImageStatusRank(incomingStatus)

  if (incomingRank > existingRank) return incomingStatus
  if (existingRank > incomingRank) return existingStatus
  return incomingStatus ?? existingStatus ?? null
}

export function getEnvironmentDisplayStatus(environment) {
  const normalized = normalizeEnvironmentRecord(environment)
  const status =
    normalized.image_status ?? normalized.imageStatus ?? ENVIRONMENT_IMAGE_STATUS.PENDING

  switch (status) {
    case ENVIRONMENT_IMAGE_STATUS.QUEUED:
      return 'Queued'
    case ENVIRONMENT_IMAGE_STATUS.GENERATING:
      return 'Generating…'
    case ENVIRONMENT_IMAGE_STATUS.COMPLETED:
      return 'Image ready'
    case ENVIRONMENT_IMAGE_STATUS.FAILED:
      return 'Failed'
    default:
      return 'Not generated'
  }
}

export function normalizeEnvironmentRecord(environment) {
  if (!environment) return environment

  const assets = Array.isArray(environment.assets) ? environment.assets : []
  const primaryAsset =
    assets.find((asset) => asset.is_primary && asset.image_url) ??
    assets.find((asset) => asset.image_url) ??
    null

  const imageUrl =
    environment.image_url ??
    environment.imageUrl ??
    primaryAsset?.image_url ??
    ''

  let image_status = normalizeEnvironmentImageStatus(
    environment.image_status ?? environment.imageStatus,
    imageUrl
  )

  return {
    ...environment,
    image_url: imageUrl,
    image_status,
  }
}

function normalizeEnvironmentImageStatus(rawStatus, imageUrl) {
  const status = String(rawStatus ?? '')
    .trim()
    .toLowerCase()

  const aliased =
    {
      complete: ENVIRONMENT_IMAGE_STATUS.COMPLETED,
      completed: ENVIRONMENT_IMAGE_STATUS.COMPLETED,
      done: ENVIRONMENT_IMAGE_STATUS.COMPLETED,
      success: ENVIRONMENT_IMAGE_STATUS.COMPLETED,
      ready: ENVIRONMENT_IMAGE_STATUS.COMPLETED,
      processing: ENVIRONMENT_IMAGE_STATUS.GENERATING,
      running: ENVIRONMENT_IMAGE_STATUS.GENERATING,
      in_progress: ENVIRONMENT_IMAGE_STATUS.GENERATING,
      queued: ENVIRONMENT_IMAGE_STATUS.QUEUED,
      generating: ENVIRONMENT_IMAGE_STATUS.GENERATING,
      failed: ENVIRONMENT_IMAGE_STATUS.FAILED,
      error: ENVIRONMENT_IMAGE_STATUS.FAILED,
      pending: ENVIRONMENT_IMAGE_STATUS.PENDING,
    }[status] ?? status

  if (imageUrl && aliased !== ENVIRONMENT_IMAGE_STATUS.FAILED) {
    return ENVIRONMENT_IMAGE_STATUS.COMPLETED
  }

  // Do not treat "completed" without an image URL as done — that hides missing media.
  if (aliased === ENVIRONMENT_IMAGE_STATUS.COMPLETED && !imageUrl) {
    return ENVIRONMENT_IMAGE_STATUS.PENDING
  }

  if (!aliased) {
    return imageUrl ? ENVIRONMENT_IMAGE_STATUS.COMPLETED : ENVIRONMENT_IMAGE_STATUS.PENDING
  }

  return aliased
}

export function patchEnvironmentsFromProgress(current = [], incoming = []) {
  return mergeEnvironmentListsPreservingImages(current, incoming)
}

function environmentMergeKey(environment) {
  return String(environment?.db_id ?? environment?.id ?? environment?.name ?? '')
}

export function mergeEnvironmentListsPreservingImages(current = [], incoming = []) {
  if (!incoming.length) return normalizeEnvironmentList(current)
  if (!current.length) return normalizeEnvironmentList(incoming)

  const currentByKey = new Map()
  normalizeEnvironmentList(current).forEach((environment) => {
    const key = environmentMergeKey(environment)
    if (key) currentByKey.set(key, environment)
  })

  const seen = new Set()
  const merged = normalizeEnvironmentList(incoming).map((incomingEnvironment) => {
    const key = environmentMergeKey(incomingEnvironment)
    if (key) seen.add(key)
    const existing = key ? currentByKey.get(key) : null
    return mergeEnvironmentRecord(existing, incomingEnvironment)
  })

  currentByKey.forEach((existing, key) => {
    if (!seen.has(key)) {
      merged.push(existing)
    }
  })

  return merged
}

export function normalizeEnvironmentList(environments = []) {
  return environments.map((environment) => normalizeEnvironmentRecord(environment))
}

export function isEnvironmentGenerating(environment) {
  const normalized = normalizeEnvironmentRecord(environment)
  const status = normalized.image_status ?? normalized.imageStatus
  return (
    status === ENVIRONMENT_IMAGE_STATUS.QUEUED ||
    status === ENVIRONMENT_IMAGE_STATUS.GENERATING
  )
}

export function isEnvironmentFailed(environment) {
  const normalized = normalizeEnvironmentRecord(environment)
  return normalized.image_status === ENVIRONMENT_IMAGE_STATUS.FAILED
}

export function hasProjectEnvironments(environments = []) {
  return environments.length > 0
}

export function mergeEnvironmentRecord(existing, incoming) {
  if (!existing) return incoming
  if (!incoming) return existing

  const existingRank = environmentImageStatusRank(existing.image_status)
  const incomingRank = environmentImageStatusRank(incoming.image_status)
  const existingHasImage = Boolean(String(existing.image_url ?? '').trim())
  const incomingHasImage = Boolean(String(incoming.image_url ?? '').trim())

  if (
    existing.image_status === ENVIRONMENT_IMAGE_STATUS.COMPLETED &&
    existingHasImage &&
    incomingRank >= 0 &&
    incomingRank < existingRank
  ) {
    return {
      ...existing,
    }
  }

  if (existingHasImage && !incomingHasImage) {
    console.log('[Blocked overwrite] environment image_url preserved', {
      name: existing.name ?? existing.id,
    })
  }

  const imageStatus = pickPreferredEnvironmentImageStatus(
    existing.image_status,
    incoming.image_status
  )
  const incomingAuthoritative = incomingRank > existingRank || (incomingRank === existingRank && incomingHasImage)
  const base = incomingAuthoritative ? incoming : existing
  const supplemental = incomingAuthoritative ? existing : incoming

  return {
    ...supplemental,
    ...base,
    id: existing.id ?? incoming.id,
    db_id: existing.db_id ?? incoming.db_id ?? incoming.id ?? existing.id,
    image_status: imageStatus,
    // Never keep "completed" without a URL when the other side has one.
    image_url: incomingHasImage
      ? incoming.image_url
      : existingHasImage
        ? existing.image_url
        : incoming.image_url || existing.image_url || '',
  }
}

export function mergeEnvironments(current = [], incoming = []) {
  if (!incoming.length) return current

  return incoming.map((incomingEnvironment) => {
    const existing = current.find(
      (environment) =>
        (incomingEnvironment.id != null &&
          String(environment.id) === String(incomingEnvironment.id)) ||
        (incomingEnvironment.db_id != null &&
          String(environment.db_id) === String(incomingEnvironment.db_id)) ||
        (incomingEnvironment.name &&
          environment.name &&
          environment.name.toLowerCase() === incomingEnvironment.name.toLowerCase())
    )

    return mergeEnvironmentRecord(existing, incomingEnvironment)
  })
}

export function mergeEnvironmentsWithPriority({
  fullProjectEnvironments = [],
  progressEnvironments = [],
  localEnvironments = [],
  fallbackEnvironments = [],
} = {}) {
  const primary =
    fullProjectEnvironments.length > 0
      ? fullProjectEnvironments
      : progressEnvironments.length > 0
        ? progressEnvironments
        : localEnvironments.length > 0
          ? localEnvironments
          : fallbackEnvironments

  if (!primary.length) return []

  let merged = primary
  if (fullProjectEnvironments.length) {
    merged = mergeEnvironments(merged, fullProjectEnvironments)
  }
  if (progressEnvironments.length) {
    merged = mergeEnvironments(merged, progressEnvironments)
  }

  if (
    localEnvironments.length &&
    !fullProjectEnvironments.length &&
    !progressEnvironments.length
  ) {
    merged = mergeEnvironments(merged, localEnvironments)
  }

  return merged
}

export function shouldAutoStartEnvironmentGeneration(status, { environments = [] } = {}) {
  if (hasProjectEnvironments(environments)) return false
  if (
    status === PROJECT_GEN_STATUS.COMPLETED ||
    status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS ||
    status === PROJECT_GEN_STATUS.CANCELLED ||
    status === PROJECT_GEN_STATUS.RUNNING ||
    status === PROJECT_GEN_STATUS.STALLED ||
    status === 'queued' ||
    status === 'generating'
  ) {
    return false
  }
  return true
}

export function allEnvironmentsImageComplete(environments = []) {
  const normalized = normalizeEnvironmentList(environments)
  return (
    normalized.length > 0 &&
    normalized.every(
      (environment) =>
        environment.image_status === ENVIRONMENT_IMAGE_STATUS.COMPLETED ||
        environment.image_status === ENVIRONMENT_IMAGE_STATUS.FAILED
    )
  )
}

export function areEnvironmentsGenerationSettled(environments = []) {
  const normalized = normalizeEnvironmentList(environments)
  if (!normalized.length) return false
  return !normalized.some((environment) => isEnvironmentGenerating(environment))
}

export function hasActiveEnvironmentGenerationTasks(progress, environments = []) {
  const normalized = normalizeEnvironmentList(environments)

  if (normalized.length > 0 && areEnvironmentsGenerationSettled(normalized)) {
    return false
  }

  const running = progress?.running ?? 0
  const queued = progress?.queued ?? 0
  if (running > 0 || queued > 0) return true

  const combined = [
    ...normalizeEnvironmentList(progress?.environments ?? []),
    ...normalized,
  ]

  return combined.some((environment) => isEnvironmentGenerating(environment))
}

export function shouldStopEnvironmentPolling(progress, environments = []) {
  if (progress?.stalled) {
    return false
  }

  const normalized = normalizeEnvironmentList(environments)

  if (normalized.length > 0 && allEnvironmentsImageComplete(normalized)) {
    return true
  }

  if (progress && isGenerationTerminal(progress.status)) {
    return allEnvironmentsImageComplete(normalized) || normalized.length === 0
  }

  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const failed = progress?.failed ?? 0

  if (
    total > 0 &&
    completed + failed >= total &&
    (normalized.length === 0 || allEnvironmentsImageComplete(normalized))
  ) {
    return true
  }

  return false
}

export function mergeEnvironmentProgressWithList(progress, environments = []) {
  if (!progress) return null

  const normalized = normalizeEnvironmentList(environments)
  const total = Math.max(progress.total ?? 0, normalized.length)
  const completedFromList = normalized.filter(
    (environment) => environment.image_status === ENVIRONMENT_IMAGE_STATUS.COMPLETED
  ).length
  const failedFromList = normalized.filter(
    (environment) => environment.image_status === ENVIRONMENT_IMAGE_STATUS.FAILED
  ).length

  const completed = Math.max(progress.completed ?? 0, completedFromList)
  const failed = Math.max(progress.failed ?? 0, failedFromList)
  const remaining = Math.max(0, total - completed - failed)

  return {
    ...progress,
    total,
    completed,
    failed,
    remaining,
    progress_percent:
      total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : progress.progress_percent,
  }
}

export function normalizeEnvironmentGenerationProgress(progress, environments = []) {
  const normalizedEnvironments = normalizeEnvironmentList(environments)
  const merged = mergeEnvironmentProgressWithList(progress, normalizedEnvironments)
  const imagesDone = allEnvironmentsImageComplete(normalizedEnvironments)
  const isComplete = hasProjectEnvironments(normalizedEnvironments) && imagesDone

  const adjustedProgress =
    merged && !imagesDone && isGenerationTerminal(merged.status)
      ? {
          ...merged,
          status: PROJECT_GEN_STATUS.RUNNING,
          progress_percent: undefined,
        }
      : merged

  return normalizeGenerationProgress(adjustedProgress, { isComplete })
}

export function isEnvironmentGenerationInProgress(status) {
  return (
    status === PROJECT_GEN_STATUS.RUNNING ||
    status === PROJECT_GEN_STATUS.STALLED ||
    status === 'queued' ||
    status === 'generating'
  )
}
