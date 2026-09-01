import {
  getStoryboardSceneShotImageProgress,
  getStoryboardSceneShotProgress,
  startStoryboardSceneShotGeneration,
  startStoryboardSceneShotImageGeneration,
} from '../../services/adstoryApi'
import {
  areAllSceneShotImagesDone,
  isStoryboardShotGenerationActive,
  shouldStopStoryboardShotPolling,
} from '../storyboardWorkspaceStatus'
import { clearStoryboardStale, markStoryboardGenerated } from '../storyboardStale'

export const STORYBOARD_PIPELINE_PHASES = [
  {
    id: 'shots',
    title: 'Shots',
    description: 'AI breaks each scene into director shots, from scene one to the last',
  },
  {
    id: 'images',
    title: 'Images',
    description: 'Generate storyboard images for every shot',
  },
]

const POLL_MS = 2000
const MAX_WAIT_MS = 45 * 60 * 1000

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function assertNotAborted(signal) {
  if (signal?.aborted) {
    const error = new Error('Generation cancelled')
    error.name = 'AbortError'
    throw error
  }
}

function sceneIdOf(scene) {
  return scene?.apiId ?? scene?.id ?? null
}

function sortScenes(scenes = []) {
  return [...scenes].sort((a, b) => {
    const aNum = Number(a.scene_number ?? a.sceneNumber ?? a.order_index ?? 0)
    const bNum = Number(b.scene_number ?? b.sceneNumber ?? b.order_index ?? 0)
    return aNum - bNum
  })
}

function sceneLabel(scene, index, total) {
  const number = scene?.scene_number ?? scene?.sceneNumber ?? index + 1
  const title = scene?.title?.trim()
  const base = title ? `Scene ${number}: ${title}` : `Scene ${number}`
  return `${base} (${index + 1}/${total})`
}

function progressPercentFrom(progress, fallback = 0) {
  if (progress?.progress_percent != null && Number.isFinite(Number(progress.progress_percent))) {
    return Math.min(100, Math.max(0, Math.round(Number(progress.progress_percent))))
  }
  const total = progress?.total ?? 0
  if (total <= 0) return fallback
  const done = (progress?.completed ?? 0) + (progress?.failed ?? 0)
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)))
}

function overallPercent(sceneIndex, sceneCount, localPercent) {
  if (sceneCount <= 0) return localPercent
  const clamped = Math.min(100, Math.max(0, localPercent))
  return Math.min(100, Math.round(((sceneIndex + clamped / 100) / sceneCount) * 100))
}

function sceneNeedsShots(scene) {
  const status = scene?.shotGenerationStatus ?? scene?.shot_generation_status ?? null
  if (isStoryboardShotGenerationActive(status)) return true
  return (scene?.shotCount ?? scene?.shot_count ?? 0) <= 0
}

function errorMessage(err, fallback) {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

export function shouldRunStoryboardPipeline(scenes = []) {
  if (!scenes.length) return false
  return scenes.some((scene) => sceneNeedsShots(scene))
}

export function unifiedPipelineStoryboardDoneKey(projectId) {
  return `adstory:unified-pipeline-storyboard-done:${projectId}`
}

export function markUnifiedPipelineStoryboardDone(projectId) {
  if (projectId == null) return
  markStoryboardGenerated(projectId)
  try {
    sessionStorage.setItem(unifiedPipelineStoryboardDoneKey(projectId), '1')
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export function consumeUnifiedPipelineStoryboardDone(projectId) {
  if (projectId == null) return false
  try {
    const key = unifiedPipelineStoryboardDoneKey(projectId)
    const value = sessionStorage.getItem(key)
    if (value) sessionStorage.removeItem(key)
    return value === '1'
  } catch {
    return false
  }
}

/**
 * True when shots and/or images still need generating for this storyboard.
 */
export async function projectNeedsStoryboardPipeline(projectId, scenes = []) {
  if (!projectId || !scenes.length) return false
  if (shouldRunStoryboardPipeline(scenes)) return true

  const ordered = sortScenes(scenes)
  const results = await Promise.all(
    ordered.map(async (scene) => {
      const sceneId = sceneIdOf(scene)
      if (sceneId == null) return false
      if ((scene.shotCount ?? scene.shot_count ?? 0) <= 0) return false

      try {
        const progress = await getStoryboardSceneShotImageProgress(projectId, sceneId)
        if ((progress.shots?.length ?? 0) > 0) {
          return !areAllSceneShotImagesDone(progress.shots)
        }
        const total = progress.total ?? 0
        if (total > 0) {
          const settled =
            (progress.completed ?? 0) + (progress.failed ?? 0) >= total
          return !settled
        }
        return true
      } catch {
        return false
      }
    })
  )

  return results.some(Boolean)
}

async function pollUntil({
  fetchProgress,
  isDone,
  onTick,
  signal,
  label,
  treatFailedAsDone = false,
}) {
  const startedAt = Date.now()
  let last = null

  while (true) {
    assertNotAborted(signal)
    if (Date.now() - startedAt > MAX_WAIT_MS) {
      throw new Error(`${label} timed out. Please try again.`)
    }

    last = await fetchProgress()
    onTick?.(last)

    const status = last?.status ?? null
    if (status === 'cancelled') {
      throw new Error(`${label} was cancelled.`)
    }
    if (status === 'failed') {
      if (treatFailedAsDone) return last
      throw new Error(`${label} failed.`)
    }
    if (isDone(last)) {
      return last
    }

    await sleep(POLL_MS)
  }
}

/**
 * Generates storyboard shots for every scene, then images for those shots.
 * Per-scene failures are recorded and skipped so the rest of the board still runs.
 */
export async function runStoryboardGenerationPipeline({
  projectId,
  scenes = [],
  styleLabel = '',
  signal,
  force = false,
  onPhaseChange,
  onSceneMeta,
  onShots,
}) {
  if (!projectId) {
    throw new Error('Open a project before generating the storyboard.')
  }

  const ordered = sortScenes(scenes)
  if (!ordered.length) {
    throw new Error('No scenes found for storyboard generation.')
  }

  const warnings = []

  const emit = (phaseId, patch = {}) => {
    onPhaseChange?.({
      phaseId,
      percent: 0,
      message: '',
      status: 'running',
      ...patch,
    })
  }

  // ——— Phase 1: shots for every scene ———
  emit('shots', {
    percent: 2,
    message: `Preparing shots for ${ordered.length} scenes…`,
  })

  for (let index = 0; index < ordered.length; index += 1) {
    assertNotAborted(signal)
    const scene = ordered[index]
    const sceneId = sceneIdOf(scene)
    if (sceneId == null) {
      warnings.push(`Scene ${index + 1} is missing an id and was skipped.`)
      continue
    }

    const label = sceneLabel(scene, index, ordered.length)

    if (!force && !sceneNeedsShots(scene)) {
      emit('shots', {
        percent: overallPercent(index + 1, ordered.length, 0),
        message: `${label} already has shots`,
      })
      continue
    }

    emit('shots', {
      percent: overallPercent(index, ordered.length, 5),
      message: `${label} · Generating shots…`,
    })

    try {
      let progress = await startStoryboardSceneShotGeneration(projectId, sceneId, {
        style: styleLabel,
        force,
      })

      if (progress.scene) onSceneMeta?.(progress.scene)
      if (progress.shots?.length) onShots?.(sceneId, progress.shots)

      if (!shouldStopStoryboardShotPolling(progress)) {
        progress = await pollUntil({
          fetchProgress: () => getStoryboardSceneShotProgress(projectId, sceneId),
          isDone: (next) => shouldStopStoryboardShotPolling(next),
          signal,
          label: `Shot generation for ${label}`,
          treatFailedAsDone: true,
          onTick: (next) => {
            if (next.scene) onSceneMeta?.(next.scene)
            if (next.shots?.length) onShots?.(sceneId, next.shots)
            emit('shots', {
              percent: overallPercent(index, ordered.length, progressPercentFrom(next, 10)),
              message: `${label} · Generating shots…`,
            })
          },
        })
      }

      if (progress?.status === 'failed') {
        warnings.push(`${label}: shot generation failed.`)
        emit('shots', {
          percent: overallPercent(index + 1, ordered.length, 0),
          message: `${label} · Shots failed — continuing`,
        })
        continue
      }

      if (progress.scene) onSceneMeta?.(progress.scene)
      if (progress.shots?.length) onShots?.(sceneId, progress.shots)

      emit('shots', {
        percent: overallPercent(index + 1, ordered.length, 0),
        message: `${label} · Shots ready`,
      })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      warnings.push(`${label}: ${errorMessage(err, 'shot generation failed')}`)
      emit('shots', {
        percent: overallPercent(index + 1, ordered.length, 0),
        message: `${label} · Skipped — continuing`,
      })
    }
  }

  emit('shots', {
    percent: 100,
    message:
      warnings.length > 0
        ? `Shots phase finished with ${warnings.length} issue(s). Starting images…`
        : 'All scene shots ready',
    status: 'done',
  })

  // ——— Phase 2: images for every scene ———
  emit('images', {
    percent: 2,
    message: `Generating images for ${ordered.length} scenes…`,
  })

  for (let index = 0; index < ordered.length; index += 1) {
    assertNotAborted(signal)
    const scene = ordered[index]
    const sceneId = sceneIdOf(scene)
    if (sceneId == null) continue

    const label = sceneLabel(scene, index, ordered.length)

    emit('images', {
      percent: overallPercent(index, ordered.length, 5),
      message: `${label} · Generating images…`,
    })

    try {
      let progress = await getStoryboardSceneShotImageProgress(projectId, sceneId).catch(() => null)

      const shots = progress?.shots ?? []
      const total = progress?.total ?? shots.length
      const settledCount = (progress?.completed ?? 0) + (progress?.failed ?? 0)
      const imagesSettled =
        !force &&
        ((shots.length > 0 && areAllSceneShotImagesDone(shots)) ||
          (total > 0 && settledCount >= total))

      if (imagesSettled) {
        if (shots.length) onShots?.(sceneId, shots)
        emit('images', {
          percent: overallPercent(index + 1, ordered.length, 0),
          message: `${label} · Images ready`,
        })
        continue
      }

      // No shots yet for this scene — skip images.
      if ((total ?? 0) === 0 && shots.length === 0 && (scene.shotCount ?? 0) <= 0) {
        const refreshed = await getStoryboardSceneShotProgress(projectId, sceneId).catch(() => null)
        if (!(refreshed?.shots?.length > 0)) {
          warnings.push(`${label}: no shots available for images.`)
          emit('images', {
            percent: overallPercent(index + 1, ordered.length, 0),
            message: `${label} · No shots — skipped`,
          })
          continue
        }
      }

      progress = await startStoryboardSceneShotImageGeneration(projectId, sceneId, { force })
      if (progress.scene) onSceneMeta?.(progress.scene)
      if (progress.shots?.length) onShots?.(sceneId, progress.shots)

      const startSettled =
        (progress.shots?.length > 0 && areAllSceneShotImagesDone(progress.shots)) ||
        ((progress.total ?? 0) > 0 &&
          (progress.completed ?? 0) + (progress.failed ?? 0) >= (progress.total ?? 0))

      if (!startSettled) {
        progress = await pollUntil({
          fetchProgress: () => getStoryboardSceneShotImageProgress(projectId, sceneId),
          isDone: (next) => {
            const nextShots = next?.shots ?? []
            if (nextShots.length > 0 && areAllSceneShotImagesDone(nextShots)) return true
            const nextTotal = next?.total ?? 0
            if (nextTotal <= 0) return false
            return (next?.completed ?? 0) + (next?.failed ?? 0) >= nextTotal
          },
          signal,
          label: `Image generation for ${label}`,
          treatFailedAsDone: true,
          onTick: (next) => {
            if (next.scene) onSceneMeta?.(next.scene)
            if (next.shots?.length) onShots?.(sceneId, next.shots)
            emit('images', {
              percent: overallPercent(index, ordered.length, progressPercentFrom(next, 10)),
              message: `${label} · Generating images…`,
            })
          },
        })
      }

      if (progress.scene) onSceneMeta?.(progress.scene)
      if (progress.shots?.length) onShots?.(sceneId, progress.shots)

      emit('images', {
        percent: overallPercent(index + 1, ordered.length, 0),
        message: `${label} · Images ready`,
      })
    } catch (err) {
      if (err?.name === 'AbortError') throw err
      warnings.push(`${label}: ${errorMessage(err, 'image generation failed')}`)
      emit('images', {
        percent: overallPercent(index + 1, ordered.length, 0),
        message: `${label} · Skipped — continuing`,
      })
    }
  }

  emit('images', {
    percent: 100,
    message:
      warnings.length > 0
        ? `Storyboard finished with ${warnings.length} issue(s). Review scenes with warnings.`
        : 'Storyboard shots and images are ready.',
    status: 'complete',
    warnings,
  })

  markStoryboardGenerated(projectId)
  if (force) {
    clearStoryboardStale(projectId)
  }

  return { scenes: ordered, warnings }
}
