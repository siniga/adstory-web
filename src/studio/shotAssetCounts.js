export { getShotAssetCounts } from './resolveShotAssets'

export function buildCharacterCountsByShotId(assignments = {}) {
  const counts = {}

  for (const [shotId, assignment] of Object.entries(assignments)) {
    counts[shotId] = assignment?.characterIds?.length ?? 0
  }

  return counts
}

export function buildCharacterCountsFromShots(scenes = []) {
  const counts = {}

  for (const scene of scenes) {
    for (const shot of scene.shots ?? []) {
      counts[shot.id] = shot.characters?.length ?? 0
    }
  }

  return counts
}

export function formatDurationBadge(shot) {
  if (!shot) return null

  const seconds =
    shot.durationSeconds ??
    (typeof shot.duration === 'string'
      ? parseFloat(shot.duration.replace(/[^\d.]/g, ''))
      : Number(shot.duration))

  if (!Number.isFinite(seconds) || seconds <= 0) return null
  const rounded = Number.isInteger(seconds) ? seconds : Math.round(seconds * 10) / 10
  return `${rounded} sec`
}
