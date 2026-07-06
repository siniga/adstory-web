import {
  createAdstoryProject,
  getAdstoryProject,
  listAdstoryProjects,
  mapAdstoryProjectToApiShape,
  saveProjectCore,
} from './adstoryApi'

export function extractProjectPayload(response) {
  if (response?.success === true && response?.data) {
    return response.data
  }
  if (response?.data?.id != null) {
    return response.data
  }
  return response
}

export function extractProjectId(response) {
  const project = extractProjectPayload(response)
  return project?.id ?? response?.id ?? response?.data?.id ?? null
}

export function extractGenerationStatusData(response) {
  return response?.data ?? response
}

export function extractCharacterBuildResponse(response) {
  if (!response) {
    return { done: false, data: null }
  }
  return { done: Boolean(response.done), data: response.data ?? response }
}

function studioUnavailable(feature) {
  return () =>
    Promise.reject(
      new Error(`${feature} is not available yet. Connect the Screenly studio API endpoint.`)
    )
}

export async function downloadFile() {
  return { ok: true }
}

export const downloadCharacterHeroImage = downloadFile
export const downloadCharacterReferencesZip = downloadFile
export const downloadEnvironmentImage = downloadFile
export const downloadProjectCharactersZip = downloadFile
export const downloadProjectEnvironmentsZip = downloadFile
export const downloadProjectAssetsZip = downloadFile

export async function listProjects() {
  return listAdstoryProjects()
}

export async function createProject(payload = {}) {
  const result = await createAdstoryProject(payload)
  const project = mapAdstoryProjectToApiShape(result.project)

  return {
    project,
    projectId: result.projectId,
    response: { data: project },
  }
}

export async function getProject(projectId) {
  return getAdstoryProject(projectId)
}

export async function updateProject(projectId, data = {}) {
  const payload = {}

  if (data.visual_style != null) {
    payload.style = data.visual_style
  }

  if (data.title != null) {
    payload.title = data.title
  }

  if (data.story != null) {
    payload.story = data.story
  }

  if (data.script != null) {
    payload.script = data.script
  }

  if (data.screenplay != null) {
    payload.screenplay = data.screenplay
  }

  if (data.current_step != null) {
    payload.current_step = data.current_step
  }

  if (data.status != null) {
    payload.status = data.status
  }

  if (data.meta != null) {
    payload.meta = data.meta
  }

  return saveProjectCore(projectId, payload)
}

export const generateScript = studioUnavailable('Script generation')
export const generateScreenplay = studioUnavailable('Screenplay generation')
export const generateScenes = studioUnavailable('Scene generation')
export const generateShots = studioUnavailable('Shot generation')
export const suggestEnvironments = studioUnavailable('Environment suggestions')
export const getProjectEnvironments = studioUnavailable('Environment listing')
export const generateEnvironment = studioUnavailable('Environment generation')
export const generateAllEnvironments = studioUnavailable('Environment batch generation')
export const acceptAllEnvironments = studioUnavailable('Environment acceptance')
export const updateEnvironment = studioUnavailable('Environment updates')
export const deleteEnvironment = studioUnavailable('Environment deletion')
export const acceptEnvironment = studioUnavailable('Environment acceptance')
export const rejectEnvironment = studioUnavailable('Environment rejection')
export const restoreEnvironment = studioUnavailable('Environment restore')
export const skipEnvironment = studioUnavailable('Environment skip')
export const suggestObjects = studioUnavailable('Object suggestions')
export const acceptAllObjects = studioUnavailable('Object acceptance')
export const updateObject = studioUnavailable('Object updates')
export const deleteObject = studioUnavailable('Object deletion')
export const acceptObject = studioUnavailable('Object acceptance')
export const rejectObject = studioUnavailable('Object rejection')
export const restoreObject = studioUnavailable('Object restore')
export const suggestCharacters = studioUnavailable('Character suggestions')
export const generateCharacters = studioUnavailable('Character generation')
export const generateCharacterImage = studioUnavailable('Character image generation')
export const generateAllCharacterImages = studioUnavailable('Character batch image generation')
export const getProjectCharacters = studioUnavailable('Character listing')
export const generateCharacter = studioUnavailable('Character generation')
export const generateAllCharacters = studioUnavailable('Character batch generation')
export const acceptAllCharacters = studioUnavailable('Character acceptance')
export const updateCharacter = studioUnavailable('Character updates')
export const deleteCharacter = studioUnavailable('Character deletion')
export const getShotCharacters = studioUnavailable('Shot character listing')
export const syncShotCharacters = studioUnavailable('Shot character sync')
export const syncShotEnvironment = studioUnavailable('Shot environment sync')
export const syncShotObjects = studioUnavailable('Shot object sync')
export const removeShotCharacter = studioUnavailable('Shot character removal')
export const removeShotEnvironment = studioUnavailable('Shot environment removal')
export const removeShotObject = studioUnavailable('Shot object removal')
export const getShotPrompt = studioUnavailable('Shot prompt lookup')
export const generateCharacterReference = studioUnavailable('Character reference generation')
export const generateEnvironmentReferenceImage = studioUnavailable('Environment reference generation')
export const generateObjectReferenceImage = studioUnavailable('Object reference generation')
export const assignAssetsToShots = studioUnavailable('Asset assignment')
export const acceptCharacter = studioUnavailable('Character acceptance')
export const skipCharacter = studioUnavailable('Character skip')
export const doCharacterReferencesLater = studioUnavailable('Character reference deferral')
export const modifyCharacterWithPrompt = studioUnavailable('Character prompt modification')
export const generateCharacterIdentities = studioUnavailable('Character identity generation')
export const getCharacterGenerationStatus = studioUnavailable('Character generation status')
export const startCharacterBuild = studioUnavailable('Character build')
export const buildNextCharacter = studioUnavailable('Character build step')
export const startEnvironmentBuild = studioUnavailable('Environment build')
export const buildNextEnvironment = studioUnavailable('Environment build step')
export const generateHeroImage = studioUnavailable('Hero image generation')
export const generateEnvironmentImage = studioUnavailable('Environment image generation')
export const generateProjectImages = studioUnavailable('Project image generation')
export const generateSceneImages = studioUnavailable('Scene image generation')
export const regenerateShotImage = studioUnavailable('Shot regeneration')
export const generateShotCandidates = studioUnavailable('Shot candidate generation')
export const selectShotCandidate = studioUnavailable('Shot candidate selection')
export const updateShot = studioUnavailable('Shot updates')
