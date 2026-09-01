import { BRAND } from '../config/branding'
import { DEFAULT_VISUAL_STYLE } from '../config/visualStyles'
import { isStoryboardComplete } from '../storyboard/storyboardStatus'

export { PROJECT_STORAGE_KEY, LEGACY_PROJECT_STORAGE_KEY } from '../config/branding'

export function createEmptyProject() {
  return {
    id: `project-${Date.now()}`,
    projectId: null,
    name: BRAND.untitledProjectName,
    visualStyle: DEFAULT_VISUAL_STYLE,
    story: '',
    script: '',
    screenplay: '',
    episodes: [],
    episodesSummary: [],
    scenes: [],
    shotGroups: [],
    frameGroups: [],
    characters: [],
    environments: [],
    objects: [],
    imagePrompts: {},
    generatedImages: {},
    extractedAssets: { characters: [], environment: null, objects: [] },
    studioScenes: [],
    shotAssignments: {},
    shotReviewStatuses: {},
    sceneGenerationStatus: null,
    sceneGenerationTotal: 0,
    sceneGenerationCompleted: 0,
    sceneGenerationFailed: 0,
    sceneGenerationStartedAt: null,
    sceneGenerationFinishedAt: null,
    aiTasksSummary: null,
    shotGenerationStatus: null,
    shotGenerationTotal: 0,
    shotGenerationCompleted: 0,
    shotGenerationFailed: 0,
    shotGenerationStartedAt: null,
    shotGenerationFinishedAt: null,
    characterGenerationStatus: null,
    characterGenerationTotal: 0,
    characterGenerationCompleted: 0,
    characterGenerationFailed: 0,
    characterGenerationStartedAt: null,
    characterGenerationFinishedAt: null,
    environmentGenerationStatus: null,
    environmentGenerationTotal: 0,
    environmentGenerationCompleted: 0,
    environmentGenerationFailed: 0,
    environmentGenerationStartedAt: null,
    environmentGenerationFinishedAt: null,
    status: {
      story: 'ready',
      script: 'idle',
      screenplay: 'idle',
      sceneboard: 'idle',
      scenes: 'idle',
      shots: 'idle',
      characters: 'idle',
      environments: 'idle',
      objects: 'idle',
      frames: 'idle',
      images: 'idle',
    },
    updatedAt: Date.now(),
  }
}

export function isProjectReadyForStudio(project) {
  const sceneboardReady =
    project.status?.sceneboard === 'done' ||
    project.status?.shots === 'done' ||
    (project.scenes?.length ?? 0) > 0 ||
    (project.shotGroups?.length ?? 0) > 0

  return (
    ((project.studioScenes?.length ?? 0) > 0 || (project.shotGroups?.length ?? 0) > 0) &&
    sceneboardReady
  )
}

export function isProjectReadyForStoryboard(project) {
  const sceneboardReady =
    project.status?.sceneboard === 'done' ||
    (project.scenes?.length ?? 0) > 0

  const environmentsReady =
    project.status?.environments === 'done' ||
    (project.environments?.length ?? 0) > 0

  return sceneboardReady && environmentsReady
}

function hasShotAssetAssignments(project) {
  const assignments = project.shotAssignments ?? {}

  return Object.values(assignments).some(
    (assignment) =>
      (assignment?.characterIds?.length ?? 0) > 0 ||
      assignment?.environmentId != null ||
      (assignment?.objectIds?.length ?? 0) > 0
  )
}

export function projectHasShotAssets(project) {
  return hasShotAssetAssignments(project)
}

export function isStoryAreaComplete(project) {
  const status = project.status ?? {}

  if (!project.story?.trim() || !project.screenplay?.trim()) {
    return false
  }

  if (!(project.scenes?.length ?? 0)) {
    return false
  }

  const charactersComplete =
    status.characters === 'done' || (project.characters?.length ?? 0) > 0
  const environmentsComplete =
    status.environments === 'done' || (project.environments?.length ?? 0) > 0
  const objectsComplete =
    status.objects === 'done' ||
    (project.objects?.length ?? 0) > 0 ||
    hasShotAssetAssignments(project) ||
    (charactersComplete && environmentsComplete && isProjectReadyForStudio(project))

  return charactersComplete && environmentsComplete && objectsComplete
}

export function shouldOpenStudioOnLoad(project) {
  return (
    isProjectReadyForStudio(project) &&
    isStoryAreaComplete(project) &&
    isStoryboardComplete(project.studioScenes ?? [])
  )
}

export function shouldOpenStoryboardOnLoad(project) {
  return (
    isProjectReadyForStoryboard(project) &&
    isStoryAreaComplete(project) &&
    !isStoryboardComplete(project.studioScenes ?? [])
  )
}
