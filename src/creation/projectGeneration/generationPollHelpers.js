import { isGenerationInProgress, PROJECT_GEN_STATUS } from '../aiGenerationStatus'
import {
  allCharactersPortraitComplete,
  shouldStopCharacterPolling,
} from '../characterGenerationStatus'
import {
  allEnvironmentsImageComplete,
  shouldStopEnvironmentPolling,
} from '../environmentGenerationStatus'
import { isSceneGenerationInProgress } from '../sceneGenerationStatus'

export const GENERATION_TYPES = {
  SCENES: 'scenes',
  CHARACTERS: 'characters',
  ENVIRONMENTS: 'environments',
}

export function buildSceneMeta(progress, project = {}) {
  return {
    sceneGenerationStatus: progress?.status ?? project.sceneGenerationStatus ?? null,
    sceneGenerationTotal: progress?.total ?? project.sceneGenerationTotal ?? 0,
    sceneGenerationCompleted: progress?.completed ?? project.sceneGenerationCompleted ?? 0,
    sceneGenerationFailed: progress?.failed ?? project.sceneGenerationFailed ?? 0,
    sceneGenerationStartedAt:
      progress?.project?.scene_generation_started_at ??
      project.sceneGenerationStartedAt ??
      null,
    sceneGenerationFinishedAt:
      progress?.project?.scene_generation_finished_at ??
      project.sceneGenerationFinishedAt ??
      null,
  }
}

export function buildCharacterMeta(progress, project = {}) {
  return {
    characterGenerationStatus: progress?.status ?? project.characterGenerationStatus ?? null,
    characterGenerationTotal: progress?.total ?? project.characterGenerationTotal ?? 0,
    characterGenerationCompleted: progress?.completed ?? project.characterGenerationCompleted ?? 0,
    characterGenerationFailed: progress?.failed ?? project.characterGenerationFailed ?? 0,
    characterGenerationStartedAt:
      progress?.project?.character_generation_started_at ??
      project.characterGenerationStartedAt ??
      null,
    characterGenerationFinishedAt:
      progress?.project?.character_generation_finished_at ??
      project.characterGenerationFinishedAt ??
      null,
  }
}

export function buildEnvironmentMeta(progress, project = {}) {
  return {
    environmentGenerationStatus: progress?.status ?? project.environmentGenerationStatus ?? null,
    environmentGenerationTotal: progress?.total ?? project.environmentGenerationTotal ?? 0,
    environmentGenerationCompleted: progress?.completed ?? project.environmentGenerationCompleted ?? 0,
    environmentGenerationFailed: progress?.failed ?? project.environmentGenerationFailed ?? 0,
    environmentGenerationStartedAt:
      progress?.project?.environment_generation_started_at ??
      project.environmentGenerationStartedAt ??
      null,
    environmentGenerationFinishedAt:
      progress?.project?.environment_generation_finished_at ??
      project.environmentGenerationFinishedAt ??
      null,
  }
}

export function shouldPollScenes({ progress, scenes = [], project = {}, userPaused = false }) {
  if (userPaused) return false

  const status = progress?.status ?? project.sceneGenerationStatus ?? null
  if (status === PROJECT_GEN_STATUS.CANCELLED) return false

  if (isSceneGenerationInProgress(status)) return true

  if (scenes.some((scene) => scene?.status === 'queued' || scene?.status === 'generating')) {
    return true
  }

  const remaining = progress?.remaining ?? 0
  const queued = progress?.queued ?? 0
  const running = progress?.running ?? 0
  if (remaining > 0 || queued > 0 || running > 0) return true

  return false
}

export function shouldPollCharacters({ progress, characters = [], project = {}, userPaused = false }) {
  if (userPaused) return false

  const status = progress?.status ?? project.characterGenerationStatus ?? null
  if (status === PROJECT_GEN_STATUS.CANCELLED) return false

  if (isGenerationInProgress(status)) return true

  if (
    isGenerationInProgress(progress?.status) &&
    characters.length > 0 &&
    !allCharactersPortraitComplete(characters) &&
    !shouldStopCharacterPolling(progress, characters)
  ) {
    return true
  }

  const remaining = progress?.remaining ?? 0
  const queued = progress?.queued ?? 0
  const running = progress?.running ?? 0
  if (isGenerationInProgress(progress?.status) && (remaining > 0 || queued > 0 || running > 0)) {
    return true
  }

  return false
}

export function shouldPollEnvironments({
  progress,
  environments = [],
  project = {},
  userPaused = false,
}) {
  if (userPaused) return false

  const status = progress?.status ?? project.environmentGenerationStatus ?? null
  if (status === PROJECT_GEN_STATUS.CANCELLED) return false

  if (isGenerationInProgress(status)) return true

  if (
    isGenerationInProgress(progress?.status) &&
    environments.length > 0 &&
    !allEnvironmentsImageComplete(environments) &&
    !shouldStopEnvironmentPolling(progress, environments)
  ) {
    return true
  }

  const remaining = progress?.remaining ?? 0
  const queued = progress?.queued ?? 0
  const running = progress?.running ?? 0
  if (isGenerationInProgress(progress?.status) && (remaining > 0 || queued > 0 || running > 0)) {
    return true
  }

  return false
}

export function shouldPollAnyType(state) {
  return (
    shouldPollScenes(state) ||
    shouldPollCharacters(state) ||
    shouldPollEnvironments(state)
  )
}
