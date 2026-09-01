import {
  deriveProgressPercent,
  isGenerationInProgress,
  isGenerationTerminal,
  PROJECT_GEN_STATUS,
} from '../aiGenerationStatus'
import {
  getEnvironmentGenerationProgress,
  getProjectStoryboard,
  getSceneGenerationProgress,
  mapAdstoryCharacters,
  mapAdstoryEnvironments,
  MIN_SCREENPLAY_LENGTH,
  ensureProjectCoverImage,
  startEnvironmentGeneration,
  startSceneGeneration,
} from '../../services/adstoryApi'
import {
  isSceneGenerationInProgress,
  isSceneGenerationTerminal,
} from '../sceneGenerationStatus'
import {
  allEnvironmentsImageComplete,
  hasProjectEnvironments,
} from '../environmentGenerationStatus'
import { hasProjectCharacters } from '../characterGenerationStatus'
import { buildCharacterMeta, buildEnvironmentMeta, buildSceneMeta } from '../projectGeneration/generationPollHelpers'
import * as projectApi from '../../services/projectApi'
import {
  markUnifiedPipelineStoryboardDone,
  projectNeedsStoryboardPipeline,
  runStoryboardGenerationPipeline,
} from '../../storyboard/pipeline/runStoryboardGenerationPipeline'

export const PIPELINE_PHASES = [
  {
    id: 'story',
    title: 'Story',
    description: 'Saving your story idea',
  },
  {
    id: 'screenplay',
    title: 'Screenplay',
    description: 'AI turns your story into a professional screenplay',
  },
  {
    id: 'sceneboard',
    title: 'Sequences',
    description: 'Breaking your screenplay into visual sequences',
  },
  {
    id: 'characters',
    title: 'Characters',
    description: 'Extracting the cast from your screenplay',
  },
  {
    id: 'environments',
    title: 'Environments',
    description: 'Generating environments for your sequences',
  },
  {
    id: 'storyboard',
    title: 'Storyboard',
    description: 'Generating shots and images for every scene',
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

function hasExistingText(value, minLength) {
  return (value?.trim()?.length ?? 0) >= minLength
}

function startSoftProgress(onTick, { floor = 8, ceiling = 88, step = 4, intervalMs = 900 } = {}) {
  let value = floor
  let stopped = false
  const timer = setInterval(() => {
    if (stopped) return
    value = Math.min(ceiling, value + step)
    onTick(value)
  }, intervalMs)

  return {
    finish() {
      stopped = true
      clearInterval(timer)
      onTick(100)
    },
    stop() {
      stopped = true
      clearInterval(timer)
    },
  }
}

function progressPercentFrom(progress) {
  return deriveProgressPercent({
    progress_percent: progress?.progress_percent,
    completed: progress?.completed ?? 0,
    failed: progress?.failed ?? 0,
    total: progress?.total ?? 0,
    status: progress?.status,
  })
}

async function pollUntilTerminal({
  fetchProgress,
  isTerminal,
  onTick,
  signal,
  label,
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
    if (status === PROJECT_GEN_STATUS.CANCELLED) {
      throw new Error(`${label} was cancelled.`)
    }
    if (status === 'failed') {
      throw new Error(`${label} failed.`)
    }
    if (isTerminal(status, last)) {
      return last
    }

    await sleep(POLL_MS)
  }
}

function storyboardOverallPercent(stageId, stagePercent) {
  const clamped = Math.min(100, Math.max(0, Number(stagePercent) || 0))
  if (stageId === 'images') {
    return Math.min(100, Math.round(50 + clamped / 2))
  }
  return Math.min(50, Math.round(clamped / 2))
}

/**
 * Runs Story → Storyboard in one background pass.
 * Skips phases that already have usable data and only generates what’s missing.
 */
export async function runStoryToEnvironmentsPipeline({
  snapshot,
  saveStoryToBackend,
  runStep,
  styleLabel,
  signal,
  onPhaseChange,
  onScenes,
  onCharacters,
  onEnvironments,
  onSceneMeta,
  onCharacterMeta,
  onEnvironmentMeta,
}) {
  const emit = (phaseId, patch = {}) => {
    onPhaseChange?.({
      phaseId,
      percent: 0,
      message: '',
      status: 'running',
      ...patch,
    })
  }

  let working = snapshot

  // 1. Story — always save current text (idempotent), never regenerates assets
  emit('story', { percent: 10, message: 'Saving your story…' })
  assertNotAborted(signal)
  const trimmedStory = working.story?.trim() ?? ''
  working = await saveStoryToBackend({
    story: trimmedStory,
    visualStyle: working.visualStyle,
    title: working.name,
  })
  emit('story', { percent: 100, message: 'Story saved', status: 'done' })

  // 2. Screenplay
  emit('screenplay', { percent: 8, message: 'Checking screenplay…' })
  assertNotAborted(signal)
  if (hasExistingText(working.screenplay, MIN_SCREENPLAY_LENGTH)) {
    emit('screenplay', { percent: 100, message: 'Screenplay already ready', status: 'done' })
  } else {
    emit('screenplay', { percent: 8, message: 'Generating screenplay…' })
    const soft = startSoftProgress((percent) => {
      emit('screenplay', { percent, message: 'Generating screenplay…' })
    })
    try {
      working = await runStep('screenplay', working)
      soft.finish()
    } catch (err) {
      soft.stop()
      throw err
    }
    emit('screenplay', { percent: 100, message: 'Screenplay ready', status: 'done' })
  }

  const projectId = working.projectId
  if (!projectId) {
    throw new Error('Project is missing after screenplay generation.')
  }

  // 4. Sceneboard (scenes)
  emit('sceneboard', { percent: 4, message: 'Checking sequences…' })
  assertNotAborted(signal)
  {
    let progress = await getSceneGenerationProgress(projectId).catch(() => null)
    const existingScenes = progress?.scenes ?? []

    if (existingScenes.length > 0) {
      onScenes?.(existingScenes)
      onSceneMeta?.(buildSceneMeta(progress, working))

      if (isSceneGenerationInProgress(progress?.status)) {
        emit('sceneboard', {
          percent: progressPercentFrom(progress),
          message: 'Sequences already generating…',
        })
        progress = await pollUntilTerminal({
          fetchProgress: () => getSceneGenerationProgress(projectId),
          isTerminal: (status) => isSceneGenerationTerminal(status),
          signal,
          label: 'Sequence generation',
          onTick: (next) => {
            onScenes?.(next.scenes ?? [])
            onSceneMeta?.(buildSceneMeta(next, working))
            emit('sceneboard', {
              percent: progressPercentFrom(next),
              message: 'Sequences already generating…',
            })
          },
        })
      }

      onScenes?.(progress?.scenes ?? existingScenes)
      onSceneMeta?.(buildSceneMeta(progress ?? { scenes: existingScenes }, working))
      emit('sceneboard', { percent: 100, message: 'Sequences already ready', status: 'done' })
    } else {
      progress = await startSceneGeneration(projectId)
      onScenes?.(progress.scenes ?? [])
      onSceneMeta?.(buildSceneMeta(progress, working))
      emit('sceneboard', {
        percent: progressPercentFrom(progress),
        message: 'Generating sequences…',
      })

      progress = await pollUntilTerminal({
        fetchProgress: () => getSceneGenerationProgress(projectId),
        isTerminal: (status) => isSceneGenerationTerminal(status),
        signal,
        label: 'Sequence generation',
        onTick: (next) => {
          onScenes?.(next.scenes ?? [])
          onSceneMeta?.(buildSceneMeta(next, working))
          emit('sceneboard', {
            percent: progressPercentFrom(next),
            message: 'Generating sequences…',
          })
        },
      })

      if (!(progress.scenes?.length > 0) && (progress.total ?? 0) === 0) {
        throw new Error('Sequence generation finished without creating any sequences.')
      }

      onScenes?.(progress.scenes ?? [])
      onSceneMeta?.(buildSceneMeta(progress, working))
      emit('sceneboard', { percent: 100, message: 'Sequences ready', status: 'done' })
    }
  }

  // 5. Characters
  emit('characters', { percent: 4, message: 'Checking characters…' })
  assertNotAborted(signal)
  {
    let existingCharacters = []
    try {
      const liveProject = await projectApi.getProject(projectId)
      existingCharacters = mapAdstoryCharacters(liveProject.characters ?? [])
    } catch {
      existingCharacters = []
    }

    if (hasProjectCharacters(existingCharacters)) {
      onCharacters?.(existingCharacters)
      onCharacterMeta?.(buildCharacterMeta({ characters: existingCharacters, status: 'done' }, working))
      emit('characters', { percent: 100, message: 'Characters already ready', status: 'done' })
    } else {
      emit('characters', { percent: 12, message: 'Extracting characters…' })
      const result = await projectApi.generateCharacters({
        project_id: projectId,
        style: styleLabel,
      })
      const nextCharacters = mapAdstoryCharacters(result.characters ?? [])
      onCharacters?.(nextCharacters)
      onCharacterMeta?.(buildCharacterMeta({ characters: nextCharacters, status: 'done' }, working))
      emit('characters', { percent: 100, message: 'Characters ready', status: 'done' })
    }
  }

  // 6. Environments
  emit('environments', { percent: 4, message: 'Checking environments…' })
  assertNotAborted(signal)
  {
    const tickEnvironments = (next, message) => {
      const mapped = mapAdstoryEnvironments(next.environments ?? [])
      onEnvironments?.(mapped)
      onEnvironmentMeta?.(buildEnvironmentMeta(next, working))
      emit('environments', {
        percent: progressPercentFrom(next),
        message,
      })
    }

    let progress = await getEnvironmentGenerationProgress(projectId).catch(() => null)
    const existingEnvs = progress?.environments ?? []
    const hasEnvs = hasProjectEnvironments(existingEnvs) || existingEnvs.length > 0
    const imagesDone =
      allEnvironmentsImageComplete(existingEnvs) ||
      (hasEnvs && isGenerationTerminal(progress?.status))

    if (hasEnvs && imagesDone) {
      tickEnvironments(progress ?? { environments: existingEnvs }, 'Environments already ready')
      emit('environments', { percent: 100, message: 'Environments already ready', status: 'done' })
    } else if (hasEnvs && !imagesDone) {
      tickEnvironments(progress, 'Generating environment images…')

      if (!isGenerationInProgress(progress?.status)) {
        progress = await startEnvironmentGeneration(projectId, { style: styleLabel })
        tickEnvironments(progress, 'Generating environment images…')
      }

      progress = await pollUntilTerminal({
        fetchProgress: () => getEnvironmentGenerationProgress(projectId),
        isTerminal: (status, last) => {
          if (isGenerationTerminal(status)) return true
          if (allEnvironmentsImageComplete(last?.environments ?? [])) return true
          return false
        },
        signal,
        label: 'Environment image generation',
        onTick: (next) => tickEnvironments(next, 'Generating environment images…'),
      })

      onEnvironments?.(mapAdstoryEnvironments(progress.environments ?? []))
      onEnvironmentMeta?.(buildEnvironmentMeta(progress, working))
      emit('environments', { percent: 100, message: 'Environments ready', status: 'done' })
    } else {
      progress = await startEnvironmentGeneration(projectId, { style: styleLabel })
      tickEnvironments(progress, 'Extracting environments…')

      progress = await pollUntilTerminal({
        fetchProgress: () => getEnvironmentGenerationProgress(projectId),
        isTerminal: (status, last) => {
          const list = last?.environments ?? []
          if (list.length > 0) return true
          if (isGenerationTerminal(status)) return true
          if (status === PROJECT_GEN_STATUS.IDLE && last?.phase === 'extraction') {
            return (last?.completed ?? 0) > 0 || (last?.failed ?? 0) > 0
          }
          return false
        },
        signal,
        label: 'Environment extraction',
        onTick: (next) => tickEnvironments(next, 'Extracting environments…'),
      })

      if (!(progress.environments?.length > 0)) {
        throw new Error('Environment extraction finished without creating any environments.')
      }

      tickEnvironments(progress, 'Generating environment images…')

      const imagesAlreadyDone =
        isGenerationTerminal(progress.status) ||
        allEnvironmentsImageComplete(progress.environments)

      if (!imagesAlreadyDone) {
        progress = await startEnvironmentGeneration(projectId, { style: styleLabel })
        tickEnvironments(progress, 'Generating environment images…')

        progress = await pollUntilTerminal({
          fetchProgress: () => getEnvironmentGenerationProgress(projectId),
          isTerminal: (status, last) => {
            if (isGenerationTerminal(status)) return true
            if (allEnvironmentsImageComplete(last?.environments ?? [])) return true
            return false
          },
          signal,
          label: 'Environment image generation',
          onTick: (next) => tickEnvironments(next, 'Generating environment images…'),
        })
      }

      onEnvironments?.(mapAdstoryEnvironments(progress.environments ?? []))
      onEnvironmentMeta?.(buildEnvironmentMeta(progress, working))
      emit('environments', { percent: 100, message: 'Environments ready', status: 'done' })
    }
  }

  // 7. Storyboard
  emit('storyboard', { percent: 2, message: 'Checking storyboard…' })
  assertNotAborted(signal)
  {
    const board = await getProjectStoryboard(projectId)
    const scenes = board.scenes ?? []
    onScenes?.(scenes)

    if (!scenes.length) {
      throw new Error('No scenes found for storyboard generation.')
    }

    let needsStoryboard = true
    try {
      needsStoryboard = await projectNeedsStoryboardPipeline(projectId, scenes)
    } catch {
      needsStoryboard = scenes.some(
        (scene) => (scene.shotCount ?? scene.shot_count ?? 0) <= 0
      )
    }

    if (!needsStoryboard) {
      emit('storyboard', {
        percent: 100,
        message: 'Storyboard already ready',
        status: 'done',
      })
      markUnifiedPipelineStoryboardDone(projectId)
    } else {
      emit('storyboard', {
        percent: 4,
        message: `Starting storyboard for ${scenes.length} scenes…`,
      })

      const result = await runStoryboardGenerationPipeline({
        projectId,
        scenes,
        styleLabel,
        signal,
        onPhaseChange: ({ phaseId, percent, message, status }) => {
          const overall =
            status === 'complete' || status === 'done'
              ? phaseId === 'images'
                ? 100
                : storyboardOverallPercent(phaseId, 100)
              : storyboardOverallPercent(phaseId, percent)

          emit('storyboard', {
            percent: overall,
            message: message || 'Generating storyboard…',
            ...(status === 'complete' ? {} : { status: 'running' }),
          })
        },
      })

      const warningCount = result?.warnings?.length ?? 0
      emit('storyboard', {
        percent: 100,
        message:
          warningCount > 0
            ? `Storyboard ready with ${warningCount} issue(s). You can review them next.`
            : 'Storyboard shots and images are ready',
        status: 'done',
      })
      markUnifiedPipelineStoryboardDone(projectId)
    }
  }

  // Dedicated story cover for project cards (non-fatal if it fails).
  if (projectId) {
    assertNotAborted(signal)
    emit('storyboard', {
      percent: 98,
      message: 'Creating project cover…',
      status: 'running',
    })
    try {
      await ensureProjectCoverImage(projectId)
    } catch (err) {
      console.warn('[pipeline] Project cover generation failed', {
        projectId,
        message: err instanceof Error ? err.message : String(err),
      })
      emit('storyboard', {
        percent: 99,
        message: 'Project cover could not be created — you can retry later from Projects.',
        status: 'running',
      })
    }
  }

  emit('storyboard', {
    percent: 100,
    message: 'Everything is ready. Open your storyboard to review.',
    status: 'complete',
  })

  return working
}
