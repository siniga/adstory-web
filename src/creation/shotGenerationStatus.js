import {
  isGenerationTerminal,
  normalizeGenerationProgress,
  PROJECT_GEN_STATUS,
} from './aiGenerationStatus'

export { PROJECT_GEN_STATUS as PROJECT_SHOT_GEN_STATUS }

export function hasProjectShots(shotGroups = []) {
  return shotGroups.some((group) => (group.shots?.length ?? 0) > 0)
}

export function countProjectShots(shotGroups = []) {
  return shotGroups.reduce((total, group) => total + (group.shots?.length ?? 0), 0)
}

export function mergeShotRecord(existing, incoming) {
  if (!existing) return incoming
  if (!incoming) return existing

  return {
    ...existing,
    ...incoming,
    id: existing.id ?? incoming.id,
    apiId: incoming.apiId ?? existing.apiId,
  }
}

export function mergeShotGroups(current = [], incoming = []) {
  if (!incoming.length) return current
  if (!current.length) return incoming

  const sceneIds = [
    ...new Set([...current, ...incoming].map((group) => group.sceneId)),
  ].sort((a, b) => a - b)

  return sceneIds.map((sceneId) => {
    const existing = current.find((group) => group.sceneId === sceneId)
    const inc = incoming.find((group) => group.sceneId === sceneId)

    if (!existing) return inc
    if (!inc) return existing

    const shotsByKey = new Map()
    for (const shot of existing.shots ?? []) {
      shotsByKey.set(String(shot.apiId ?? shot.id), shot)
    }
    for (const shot of inc.shots ?? []) {
      const key = String(shot.apiId ?? shot.id)
      shotsByKey.set(key, mergeShotRecord(shotsByKey.get(key), shot))
    }

    const orderedShots = [...(inc.shots ?? []), ...(existing.shots ?? [])]
      .map((shot) => shotsByKey.get(String(shot.apiId ?? shot.id)))
      .filter(Boolean)
      .filter((shot, index, list) => list.indexOf(shot) === index)

    return {
      ...existing,
      ...inc,
      sceneTitle: existing.sceneTitle ?? inc.sceneTitle,
      shots: orderedShots.length ? orderedShots : [...shotsByKey.values()],
    }
  })
}

export function mergeShotGroupsWithPriority({
  fullProjectGroups = [],
  progressGroups = [],
  localGroups = [],
  fallbackGroups = [],
} = {}) {
  const primary =
    fullProjectGroups.length > 0
      ? fullProjectGroups
      : progressGroups.length > 0
        ? progressGroups
        : localGroups.length > 0
          ? localGroups
          : fallbackGroups

  if (!primary.length) return []

  let merged = primary
  if (fullProjectGroups.length) {
    merged = mergeShotGroups(merged, fullProjectGroups)
  }
  if (progressGroups.length) {
    merged = mergeShotGroups(merged, progressGroups)
  }

  if (localGroups.length && !fullProjectGroups.length && !progressGroups.length) {
    merged = mergeShotGroups(merged, localGroups)
  }

  return merged
}

export function shouldAutoStartShotGeneration(status, { shotGroups = [] } = {}) {
  if (hasProjectShots(shotGroups)) return false
  if (
    status === PROJECT_GEN_STATUS.COMPLETED ||
    status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS ||
    status === PROJECT_GEN_STATUS.CANCELLED ||
    status === PROJECT_GEN_STATUS.RUNNING ||
    status === PROJECT_GEN_STATUS.STALLED
  ) {
    return false
  }
  return true
}

export function shouldStopShotPolling(progress, shotGroups = []) {
  if (progress && isGenerationTerminal(progress.status)) {
    return true
  }

  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const failed = progress?.failed ?? 0

  if (total > 0 && completed + failed >= total) {
    return true
  }

  return hasProjectShots(shotGroups) && progress?.status === PROJECT_GEN_STATUS.COMPLETED
}

export function normalizeShotGenerationProgress(progress, shotGroups = []) {
  const hasShots = hasProjectShots(shotGroups)
  const isComplete =
    hasShots &&
    progress?.status === PROJECT_GEN_STATUS.COMPLETED &&
    (progress?.remaining ?? 0) === 0

  return normalizeGenerationProgress(progress, { isComplete })
}
