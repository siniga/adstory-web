import { MIN_SCREENPLAY_LENGTH } from '../../services/adstoryApi'
import * as projectApi from '../../services/projectApi'
import { estimateEpisodeCount, storyNeedsEpisodes, storyTooLongMessage } from '../../services/storyLength'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'

const WRITING_PHASES = [
  { id: 'story', title: 'Story', message: 'Saving your story…' },
  { id: 'screenplay', title: 'Screenplay', message: 'Writing the screenplay…' },
]

export const SCENES_PHASE = {
  id: 'scenes',
  title: 'Sequences',
  message: 'Breaking the screenplay into sequences…',
  total: 1,
}

export const CHARACTERS_PHASE = {
  id: 'characters',
  title: 'Characters',
  message: 'Extracting characters from the screenplay…',
  total: 1,
}

export const ENVIRONMENTS_PHASE = {
  id: 'environments',
  title: 'Environments',
  message: 'Extracting environments from the screenplay…',
  total: 1,
}

export const SHOTS_PHASE = {
  id: 'shots',
  title: 'Storyboard',
  message: 'Breaking sequences into storyboard shots…',
  total: 1,
}

export const EXTRA_PHASES = {
  scenes: SCENES_PHASE,
  characters: CHARACTERS_PHASE,
  environments: ENVIRONMENTS_PHASE,
  shots: SHOTS_PHASE,
}

export const EXTRA_ORDER = ['scenes', 'characters', 'environments', 'shots']

const STAGE_NEXT = {
  screenplay: 'scenes',
  scenes: 'characters',
  characters: 'environments',
  environments: 'shots',
}

const STAGE_LANDING = {
  screenplay: 'screenplay',
  scenes: 'sceneboard',
  characters: 'characters',
  environments: 'environments',
  shots: 'storyboard',
}

const START_INDEX = {
  story: 0,
  screenplay: 1,
}

const DONE_HOLD_MS = 700

let activeWritingJob = null
let activeScenesJob = null
const workingByProject = new Map()

function hasText(value, minLength) {
  return (value?.trim()?.length ?? 0) >= minLength
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function startSoftProgress(onTick, { floor = 0.08, ceiling = 0.88, step = 0.04, intervalMs = 900 } = {}) {
  let value = floor
  let stopped = false
  const timer = setInterval(() => {
    if (stopped) return
    value = Math.min(ceiling, value + step)
    onTick(value)
  }, intervalMs)

  onTick(floor)

  return {
    stop() {
      stopped = true
      clearInterval(timer)
    },
  }
}

export function getProcessorPhases(startWith = 'story') {
  if (startWith === 'scenes') {
    return []
  }

  const startIndex = START_INDEX[startWith] ?? 0
  return WRITING_PHASES.slice(startIndex).map((phase) => ({ ...phase, total: 1 }))
}

export function getProcessorDisplayPhases(startWith = 'story', { through = null, includeScenes = false } = {}) {
  const phases = getProcessorPhases(startWith)
  const last = through ?? (includeScenes ? 'scenes' : null)
  if (!last) return phases

  const extras = []
  for (const id of EXTRA_ORDER) {
    extras.push({ ...EXTRA_PHASES[id] })
    if (id === last) break
  }
  return [...phases, ...extras]
}

export function shouldRunCreateProcessor(startWith = 'story') {
  return startWith === 'story'
}

export function getProcessorLandingStep(startWith = 'story') {
  if (startWith === 'scenes') return 'sceneboard'
  return 'screenplay'
}

export function countProcessorUnits(phases) {
  return phases.reduce((sum, phase) => sum + (phase.total ?? 1), 0)
}

export function processorPhaseMessage(phase, { alreadyReady = false } = {}) {
  if (!phase) return 'Preparing…'
  if (alreadyReady) {
    if (phase.id === 'story') return 'Story saved'
    if (phase.id === 'screenplay') return 'Screenplay already ready'
    if (phase.id === 'scenes') return 'Sequences already ready'
    if (phase.id === 'characters') return 'Characters already ready'
    if (phase.id === 'environments') return 'Environments already ready'
    if (phase.id === 'shots') return 'Storyboard shots already ready'
  }
  return phase.message
}

function emit(job, patch) {
  job.progress = { ...job.progress, ...patch }
  job.listeners.onProgress?.(job.progress)
}

async function executeWritingJob(job) {
  const { projectId, phases, working } = job
  const total = countProcessorUnits(phases)

  try {
    for (let index = 0; index < phases.length; index += 1) {
      const phase = phases[index]
      emit(job, {
        status: 'running',
        phaseIndex: index,
        completedUnits: index,
        intraProgress: 0,
        liveMessage: processorPhaseMessage(phase),
        error: null,
      })

      const needsWait =
        phase.id === 'screenplay' &&
        !hasText(working.screenplay, MIN_SCREENPLAY_LENGTH) &&
        !storyNeedsEpisodes(working.story)

      const soft = needsWait
        ? startSoftProgress((intraProgress) => emit(job, { intraProgress }))
        : null

      try {
        if (phase.id === 'story') {
          emit(job, { liveMessage: processorPhaseMessage(phase, { alreadyReady: true }) })
        } else if (phase.id === 'screenplay') {
          if (hasText(working.screenplay, MIN_SCREENPLAY_LENGTH)) {
            emit(job, { liveMessage: processorPhaseMessage(phase, { alreadyReady: true }) })
          } else if (storyNeedsEpisodes(working.story)) {
            emit(job, {
              status: 'episodes-required',
              liveMessage: storyTooLongMessage(working.story),
              estimatedEpisodes: estimateEpisodeCount(working.story),
              completedUnits: index,
              intraProgress: 0,
            })
            return
          } else {
            const result = await projectApi.generateScreenplay({
              story: working.story,
              style: working.style,
              project_id: projectId,
            })
            working.screenplay = result.screenplay ?? working.screenplay
            emit(job, { liveMessage: 'Screenplay ready' })
          }
        }
      } finally {
        soft?.stop()
      }

      emit(job, {
        completedUnits: index + 1,
        intraProgress: 1,
      })
    }

    emit(job, {
      status: 'choice',
      choiceAfter: 'screenplay',
      liveMessage: 'Screenplay is ready',
      intraProgress: 1,
      completedUnits: total,
    })
  } catch (err) {
    const friendly = formatUserFriendlyError(
      err instanceof Error ? err.message : 'Failed to generate project'
    )
    emit(job, {
      status: 'failed',
      error: friendly,
      liveMessage: friendly.title,
    })
  }
}

async function executeScenesJob(job) {
  const { projectId, working, writingUnits } = job
  const scenesIndex = writingUnits

  emit(job, {
    status: 'running',
    phaseIndex: scenesIndex,
    completedUnits: writingUnits,
    intraProgress: 0,
    liveMessage: processorPhaseMessage(SCENES_PHASE),
    error: null,
  })

  const soft = startSoftProgress((intraProgress) => emit(job, { intraProgress }))

  try {
    const result = await projectApi.generateScenes({
      screenplay: working.screenplay,
      style: working.style,
      project_id: projectId,
    })
    working.scenes = result.scenes ?? working.scenes
    soft.stop()
    emit(job, {
      status: 'choice',
      choiceAfter: 'scenes',
      liveMessage: 'Sequences are ready',
      phaseIndex: scenesIndex,
      intraProgress: 1,
      completedUnits: writingUnits + 1,
    })
  } catch (err) {
    soft.stop()
    const friendly = formatUserFriendlyError(
      err instanceof Error ? err.message : 'Failed to generate sequences'
    )
    emit(job, {
      status: 'failed',
      failedPhase: 'scenes',
      error: friendly,
      liveMessage: friendly.title,
    })
  }
}

export function startCreateWritingGeneration(
  { projectId, attempt = 0, startWith, style, story, screenplay },
  listeners
) {
  const key = `${projectId}:write:${attempt}`
  if (activeWritingJob?.key === key) {
    activeWritingJob.listeners = listeners
    listeners.onProgress?.(activeWritingJob.progress)
    return activeWritingJob.promise
  }

  const phases = getProcessorPhases(startWith)
  const previous = workingByProject.get(projectId) ?? {}
  const working = {
    style: style || previous.style || '',
    story: previous.story || story,
    screenplay: previous.screenplay || screenplay,
    scenes: previous.scenes,
  }
  workingByProject.set(projectId, working)

  const job = {
    key,
    projectId,
    phases,
    working,
    listeners,
    progress: {
      status: 'running',
      phaseIndex: 0,
      completedUnits: 0,
      intraProgress: 0,
      liveMessage: processorPhaseMessage(phases[0]),
      error: null,
    },
  }

  const promise = executeWritingJob(job)
  job.promise = promise
  activeWritingJob = job
  promise.finally(() => {
    if (activeWritingJob?.key === key) {
      activeWritingJob = null
    }
  })
  listeners.onProgress?.(job.progress)
  return promise
}

export function startCreateScenesGeneration({ projectId, attempt = 0, startWith, style }, listeners) {
  const key = `${projectId}:scenes:${attempt}`
  if (activeScenesJob?.key === key) {
    activeScenesJob.listeners = listeners
    listeners.onProgress?.(activeScenesJob.progress)
    return activeScenesJob.promise
  }

  const previous = workingByProject.get(projectId) ?? {}
  const working = {
    style: style || previous.style || '',
    story: previous.story,
    screenplay: previous.screenplay,
    scenes: previous.scenes,
  }
  workingByProject.set(projectId, working)

  const writingUnits = countProcessorUnits(getProcessorPhases(startWith))
  const job = {
    key,
    projectId,
    working,
    writingUnits,
    listeners,
    progress: {
      status: 'running',
      phaseIndex: writingUnits,
      completedUnits: writingUnits,
      intraProgress: 0,
      liveMessage: processorPhaseMessage(SCENES_PHASE),
      error: null,
    },
  }

  const promise = executeScenesJob(job)
  job.promise = promise
  activeScenesJob = job
  promise.finally(() => {
    if (activeScenesJob?.key === key) {
      activeScenesJob = null
    }
  })
  listeners.onProgress?.(job.progress)
  return promise
}

async function executeEpisodeJob(job, screenplayIndex, total) {
  const { projectId, working } = job
  const soft = startSoftProgress((intraProgress) => emit(job, { intraProgress }))

  try {
    emit(job, {
      status: 'running',
      phaseIndex: screenplayIndex,
      completedUnits: screenplayIndex,
      liveMessage: 'Dividing your story into episodes…',
      error: null,
    })

    await projectApi.planEpisodes({
      story: working.story,
      style: working.style,
      project_id: projectId,
    })

    emit(job, { liveMessage: 'Writing episode 1…' })

    const result = await projectApi.generateEpisode({
      episode_number: 1,
      style: working.style,
      project_id: projectId,
    })
    working.screenplay = result.screenplay ?? working.screenplay
    soft.stop()

    emit(job, {
      status: 'choice',
      choiceAfter: 'screenplay',
      liveMessage: 'Episode 1 screenplay is ready',
      phaseIndex: screenplayIndex,
      intraProgress: 1,
      completedUnits: total,
    })
  } catch (err) {
    soft.stop()
    const friendly = formatUserFriendlyError(
      err instanceof Error ? err.message : 'Failed to divide story into episodes'
    )
    emit(job, {
      status: 'failed',
      failedPhase: 'episodes',
      error: friendly,
      liveMessage: friendly.title,
    })
  }
}

export function startCreateEpisodeGeneration({ projectId, attempt = 0, startWith, style }, listeners) {
  const key = `${projectId}:episodes:${attempt}`
  if (activeWritingJob?.key === key) {
    activeWritingJob.listeners = listeners
    listeners.onProgress?.(activeWritingJob.progress)
    return activeWritingJob.promise
  }

  const previous = workingByProject.get(projectId) ?? {}
  const working = {
    style: style || previous.style || '',
    story: previous.story,
    screenplay: previous.screenplay,
    scenes: previous.scenes,
  }
  workingByProject.set(projectId, working)

  const phases = getProcessorPhases(startWith)
  const screenplayIndex = Math.max(0, phases.findIndex((phase) => phase.id === 'screenplay'))
  const job = {
    key,
    projectId,
    working,
    listeners,
    progress: {
      status: 'running',
      phaseIndex: screenplayIndex,
      completedUnits: screenplayIndex,
      intraProgress: 0,
      liveMessage: 'Dividing your story into episodes…',
      error: null,
    },
  }

  const promise = executeEpisodeJob(job, screenplayIndex, countProcessorUnits(phases))
  job.promise = promise
  activeWritingJob = job
  promise.finally(() => {
    if (activeWritingJob?.key === key) {
      activeWritingJob = null
    }
  })
  listeners.onProgress?.(job.progress)
  return promise
}

const stageJobs = new Map()

async function runStageApi(stage, { projectId, style, working }) {
  if (stage === 'scenes') {
    const result = await projectApi.generateScenes({
      screenplay: working.screenplay,
      style,
      project_id: projectId,
    })
    working.scenes = result.scenes ?? working.scenes
    return
  }

  if (stage === 'characters') {
    const result = await projectApi.generateCharacters({
      screenplay: working.screenplay,
      style,
      project_id: projectId,
    })
    working.characters = result.characters ?? working.characters
    return
  }

  if (stage === 'environments') {
    const result = await projectApi.generateEnvironments({
      screenplay: working.screenplay,
      style,
      project_id: projectId,
    })
    working.environments = result.environments ?? working.environments
    return
  }

  const result = await projectApi.generateShots({
    style,
    project_id: projectId,
  })
  working.shots = result.shots ?? working.shots
}

function extraUnitsThrough(through) {
  const index = EXTRA_ORDER.indexOf(through)
  return index < 0 ? 0 : index
}

async function executeStageJob(job) {
  const { projectId, working, writingUnits, stage } = job
  const phase = EXTRA_PHASES[stage]
  const phaseIndex = writingUnits + extraUnitsThrough(stage)

  emit(job, {
    status: 'running',
    phaseIndex,
    completedUnits: phaseIndex,
    intraProgress: 0,
    liveMessage: processorPhaseMessage(phase),
    error: null,
    failedPhase: null,
  })

  const soft = startSoftProgress((intraProgress) => emit(job, { intraProgress }))

  try {
    await runStageApi(stage, { projectId, style: working.style, working })
    soft.stop()

    if (stage === 'shots') {
      emit(job, {
        status: 'complete',
        liveMessage: 'Storyboard shots are ready',
        phaseIndex,
        intraProgress: 1,
        completedUnits: phaseIndex + 1,
      })
      await wait(DONE_HOLD_MS)
      job.listeners.onComplete?.({ landingStep: STAGE_LANDING.shots })
      return
    }

    emit(job, {
      status: 'choice',
      choiceAfter: stage,
      liveMessage: `${phase.title} are ready`,
      phaseIndex,
      intraProgress: 1,
      completedUnits: phaseIndex + 1,
    })
  } catch (err) {
    soft.stop()
    const friendly = formatUserFriendlyError(
      err instanceof Error ? err.message : `Failed to generate ${phase.title.toLowerCase()}`
    )
    emit(job, {
      status: 'failed',
      failedPhase: stage,
      error: friendly,
      liveMessage: friendly.title,
    })
  }
}

export function startCreateStageGeneration(
  { projectId, stage, attempt = 0, startWith, style },
  listeners
) {
  const key = `${projectId}:${stage}:${attempt}`
  const existing = stageJobs.get(key)
  if (existing) {
    existing.listeners = listeners
    listeners.onProgress?.(existing.progress)
    return existing.promise
  }

  const previous = workingByProject.get(projectId) ?? {}
  const working = {
    style: style || previous.style || '',
    story: previous.story,
    screenplay: previous.screenplay,
    scenes: previous.scenes,
    characters: previous.characters,
    environments: previous.environments,
    shots: previous.shots,
  }
  workingByProject.set(projectId, working)

  const writingUnits = countProcessorUnits(getProcessorPhases(startWith))
  const job = {
    key,
    projectId,
    stage,
    working,
    writingUnits,
    listeners,
    progress: {
      status: 'running',
      phaseIndex: writingUnits + extraUnitsThrough(stage),
      completedUnits: writingUnits + extraUnitsThrough(stage),
      intraProgress: 0,
      liveMessage: processorPhaseMessage(EXTRA_PHASES[stage]),
      error: null,
    },
  }

  const promise = executeStageJob(job)
  job.promise = promise
  stageJobs.set(key, job)
  promise.finally(() => {
    if (stageJobs.get(key) === job) {
      stageJobs.delete(key)
    }
  })
  listeners.onProgress?.(job.progress)
  return promise
}

export function nextProcessorStage(choiceAfter) {
  return STAGE_NEXT[choiceAfter] ?? null
}

export function reviewLandingStep(choiceAfter) {
  return STAGE_LANDING[choiceAfter] ?? 'screenplay'
}
