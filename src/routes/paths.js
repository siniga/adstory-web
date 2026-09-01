import { CREATION_STEPS, getStepIndex } from '../creation/creationData'
import {
  isProjectReadyForStudio,
  shouldOpenStoryboardOnLoad,
  shouldOpenStudioOnLoad,
} from '../project/projectModel'
import { isStoryboardComplete } from '../storyboard/storyboardStatus'

export const STEP_TO_SEGMENT = {
  story: 'story',
  script: 'script',
  screenplay: 'screenplay',
  sceneboard: 'sceneboard',
  characters: 'characters',
  environments: 'environments',
  storyboard: 'storyboard',
  studio: 'studio',
  assetsLibrary: 'assets',
}

export const SEGMENT_TO_STEP = Object.fromEntries(
  Object.entries(STEP_TO_SEGMENT).map(([step, segment]) => [segment, step])
)

function projectSceneboardScenes(project = {}) {
  return project.scenes ?? []
}

export function projectSceneboardPath(projectId) {
  return `/projects/${projectId}/sceneboard`
}

/** @deprecated Use projectSceneboardPath */
export function projectEpisodesPath(projectId) {
  return projectSceneboardPath(projectId)
}

export function getResumeStepIndex(project = {}) {
  const status = project.status ?? project
  const scenes = projectSceneboardScenes(project)
  let max = 0

  for (let i = 1; i < CREATION_STEPS.length; i += 1) {
    const step = CREATION_STEPS[i]

    if (step.id === 'studio') {
      if (
        isProjectReadyForStudio(project) &&
        isStoryboardComplete(project.studioScenes ?? [])
      ) {
        max = Math.max(max, i)
      }
      continue
    }

    if (step.id === 'storyboard') {
      if (
        status.environments === 'done' ||
        (project.environments?.length ?? 0) > 0
      ) {
        max = Math.max(max, i)
      }
      continue
    }

    if (step.id === 'environments') {
      if (status.characters === 'done') {
        max = Math.max(max, i)
      }
      continue
    }

    if (step.id === 'characters') {
      if (
        status.sceneboard === 'done' ||
        scenes.length > 0
      ) {
        max = Math.max(max, i)
      }
      continue
    }

    if (step.id === 'sceneboard') {
      if (
        scenes.length > 0 ||
        status.sceneboard === 'done' ||
        status.sceneboard === 'generating'
      ) {
        max = Math.max(max, i)
      }
      continue
    }

    if (status[step.id] === 'done') {
      max = Math.max(max, i)
      continue
    }
  }

  return max
}

export function getInitialCreationStep(project = {}) {
  const status = project.status ?? {}

  if (
    (status.environments === 'done' || (project.environments?.length ?? 0) > 0) &&
    !isStoryboardComplete(project.studioScenes ?? [])
  ) {
    return 'storyboard'
  }

  if (status.environments === 'done' || (project.environments?.length ?? 0) > 0) {
    return 'environments'
  }

  if (status.characters === 'done' || (project.characters?.length ?? 0) > 0) {
    return 'characters'
  }

  if (
    status.sceneboard === 'done' ||
    (project.scenes?.length ?? 0) > 0
  ) {
    return 'characters'
  }

  return getAccessibleCreationStep(project)
}

export function getStoryAreaStep(project = {}) {
  const storyboardIndex = getStepIndex('storyboard')
  const resumeIndex = getResumeStepIndex(project)
  const cappedIndex = Math.min(Math.max(resumeIndex, 0), storyboardIndex - 1)
  return CREATION_STEPS[cappedIndex]?.id ?? 'story'
}

export function getAccessibleCreationStep(project = {}) {
  const status = project.status ?? {}
  const scenes = project.scenes ?? []

  if (
    (status.environments === 'done' || (project.environments?.length ?? 0) > 0) &&
    !isStoryboardComplete(project.studioScenes ?? [])
  ) {
    return 'storyboard'
  }

  if (status.environments === 'done' || (project.environments?.length ?? 0) > 0) {
    return 'environments'
  }

  if (status.characters === 'done' || (project.characters?.length ?? 0) > 0) {
    return 'characters'
  }

  if (
    status.sceneboard === 'done' ||
    scenes.length > 0
  ) {
    return 'characters'
  }

  if (
    scenes.length > 0 ||
    status.sceneboard === 'generating' ||
    status.sceneboard === 'done'
  ) {
    return 'sceneboard'
  }

  if (project.screenplay?.trim() || status.screenplay === 'done') {
    return 'screenplay'
  }

  return CREATION_STEPS[getResumeStepIndex(project)]?.id ?? 'story'
}

export function canAccessCreationStep(stepId, project = {}) {
  if (!stepId) return false

  const stepIndex = getStepIndex(stepId)
  if (stepIndex <= getResumeStepIndex(project)) {
    return true
  }

  if (stepId === 'studio') {
    return (
      isProjectReadyForStudio(project) &&
      isStoryboardComplete(project.studioScenes ?? [])
    )
  }

  if (stepId === 'storyboard') {
    return (
      project.status?.environments === 'done' ||
      (project.environments?.length ?? 0) > 0
    )
  }

  if (stepId === 'environments' && project.status?.characters === 'done') {
    return true
  }

  if (
    stepId === 'characters' &&
    (project.status?.sceneboard === 'done' || (project.scenes?.length ?? 0) > 0)
  ) {
    return true
  }

  switch (stepId) {
    case 'story':
      return true
    case 'screenplay':
      return Boolean(project.screenplay?.trim())
    case 'sceneboard':
      return Boolean(project.screenplay?.trim()) || (project.scenes?.length ?? 0) > 0
    default:
      return false
  }
}

export function projectStepPath(projectId, stepId) {
  if (stepId === 'studio') {
    return projectStudioPath(projectId)
  }

  if (stepId === 'storyboard') {
    return projectStoryboardPath(projectId)
  }

  const segment = STEP_TO_SEGMENT[stepId] ?? 'story'
  return `/projects/${projectId}/${segment}`
}

export function projectStoryboardPath(projectId) {
  return `/projects/${projectId}/storyboard`
}

export function publicStoryboardPath(token) {
  return `/s/${token}`
}

export function projectEnvironmentsPath(projectId) {
  return projectStepPath(projectId, 'environments')
}

export function projectStudioPath(projectId) {
  return `/projects/${projectId}/studio`
}

export function projectDefaultPath(project) {
  const projectId = project?.projectId
  if (!projectId) return '/projects'

  if (shouldOpenStudioOnLoad(project)) {
    return projectStudioPath(projectId)
  }

  if (shouldOpenStoryboardOnLoad(project)) {
    return projectStoryboardPath(projectId)
  }

  const initialStep = getInitialCreationStep(project)
  if (initialStep === 'storyboard') {
    return projectStoryboardPath(projectId)
  }

  return projectStepPath(projectId, initialStep)
}

export function projectDefaultRelativePath(project) {
  const full = projectDefaultPath(project)
  const match = full.match(/\/projects\/[^/]+\/(.+)/)
  return match?.[1] ?? 'story'
}

export function stepFromPathname(pathname) {
  const match = pathname.match(/\/projects\/[^/]+\/([^/]+)/)
  if (!match) return null

  const segment = match[1]
  if (segment === 'assets') return 'characters'
  if (segment === 'scenes' || segment === 'shots' || segment === 'episodes') return 'sceneboard'
  if (segment === 'storyboard') return null

  return SEGMENT_TO_STEP[segment] ?? null
}

export function isEpisodeStoryboardPath(pathname) {
  return /\/projects\/[^/]+\/episodes\/[^/]+\/storyboard/.test(pathname)
}

export function workspaceModeFromPathname(pathname) {
  if (pathname.includes('/studio')) return 'studio'
  if (pathname.includes('/storyboard')) return 'storyboard'
  if (isEpisodeStoryboardPath(pathname)) return 'storyboard'
  return 'story'
}

export function isAssetsLibraryPath(pathname) {
  return /\/projects\/[^/]+\/(assets|characters)\/?$/.test(pathname)
}

export function isProjectWorkspacePath(pathname, projectId) {
  if (!pathname || projectId == null || projectId === '') return false
  const prefix = `/projects/${projectId}`
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function migrateLegacyHashRoute() {
  const match = window.location.hash.match(/^#\/projects\/(\d+)\/(storyboard|studio)\/?$/)
  if (!match) return false

  window.history.replaceState(null, '', `/projects/${match[1]}/${match[2]}`)
  return true
}
