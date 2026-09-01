import { apiRequest } from './api'

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
      new Error(`${feature} is not available yet. Connect the studio API endpoint.`)
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

function mapProjectRecord(project = {}) {
  const visualStyle = project.visual_style ?? project.style ?? null
  const story = project.story ?? project.story_text ?? ''

  return {
    id: project.id,
    title: project.title ?? '',
    story,
    story_preview: project.story_preview ?? story.trim().slice(0, 160),
    script: project.script ?? '',
    screenplay: project.screenplay ?? '',
    style: visualStyle,
    visual_style: visualStyle,
    current_step: project.current_step ?? null,
    status: project.status ?? null,
    cover_image_url: project.cover_image_url ?? null,
    meta: {
      visual_style: visualStyle,
      ...(project.meta ?? {}),
    },
    episodes: project.episodes ?? [],
    scenes: project.scenes ?? [],
    shots: project.shots ?? [],
    characters: project.characters ?? [],
    environments: project.environments ?? [],
    objects: project.objects ?? [],
    scenes_count: project.scenes_count ?? 0,
    shots_count: project.shots_count ?? 0,
    generated_images_count: project.generated_images_count ?? 0,
    updated_at: project.updated_at ?? null,
  }
}

export async function listProjects() {
  const data = await apiRequest('/api/projects', {
    fallbackMessage: 'Failed to load projects',
    requireSuccess: true,
  })

  const projects = data.projects ?? data.data ?? []
  if (!Array.isArray(projects)) {
    return []
  }

  return projects.map((project) => mapProjectRecord(project))
}

export async function createProject(payload = {}) {
  const data = await apiRequest('/api/projects', {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to create project',
    requireSuccess: true,
  })

  const project = mapProjectRecord(data.project)
  return {
    project,
    projectId: project.id,
    response: data,
  }
}

export async function getProject(projectId) {
  const data = await apiRequest(`/api/projects/${projectId}`, {
    fallbackMessage: 'Failed to load project',
    requireSuccess: true,
  })

  return mapProjectRecord(data.project)
}

export async function updateProject(projectId, data = {}) {
  const payload = {}

  if (data.visual_style != null) {
    payload.style = data.visual_style
  }

  if (data.style != null) {
    payload.style = data.style
  }

  if (data.title != null) {
    payload.title = data.title
  }

  if (data.story != null || data.story_text != null) {
    payload.story = data.story ?? data.story_text
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

  if (data.cover_image_url != null) {
    payload.cover_image_url = data.cover_image_url
  }

  const response = await apiRequest(`/api/projects/${projectId}`, {
    method: 'PUT',
    body: payload,
    fallbackMessage: 'Failed to update project',
    requireSuccess: true,
  })

  return mapProjectRecord(response.project)
}

export async function deleteProject(projectId) {
  if (projectId == null || projectId === '') {
    throw new Error('Project id is required.')
  }

  await apiRequest(`/api/projects/${projectId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete project',
    requireSuccess: true,
  })
}

export async function generateScript({ story, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating a script.')
  }

  const payload = {}
  if (story != null) {
    payload.story = story
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-script`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to generate script',
    requireSuccess: true,
  })

  return {
    script: data.script,
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function generateScreenplay({ story, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating a screenplay.')
  }

  const payload = {}
  if (story != null) {
    payload.story = story
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-screenplay`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to generate screenplay',
    requireSuccess: true,
  })

  return {
    screenplay: data.screenplay,
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function planEpisodes({ story, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before planning episodes.')
  }

  const payload = {}
  if (story != null) {
    payload.story = story
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/plan-episodes`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to plan episodes',
    requireSuccess: true,
  })

  return {
    episodes: data.episodes ?? data.project?.episodes ?? [],
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function generateEpisode({ episode_number = 1, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating an episode.')
  }

  const payload = { episode_number }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-episode`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to generate episode',
    requireSuccess: true,
  })

  return {
    screenplay: data.screenplay,
    episode: data.episode,
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function generateScenes({ screenplay, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating sequences.')
  }

  const payload = {}
  if (screenplay != null) {
    payload.screenplay = screenplay
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-scenes`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to generate sequences',
    requireSuccess: true,
  })

  return {
    scenes: data.scenes ?? data.project?.scenes ?? [],
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function generateCharacters({ screenplay, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating characters.')
  }

  const payload = {}
  if (screenplay != null) {
    payload.screenplay = screenplay
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-characters`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to extract characters',
    requireSuccess: true,
  })

  return {
    characters: data.characters ?? data.project?.characters ?? [],
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function generateEnvironments({ screenplay, style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating environments.')
  }

  const payload = {}
  if (screenplay != null) {
    payload.screenplay = screenplay
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-environments`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to extract environments',
    requireSuccess: true,
  })

  return {
    environments: data.environments ?? data.project?.environments ?? [],
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export async function generateShots({ style, project_id }) {
  if (project_id == null || project_id === '') {
    throw new Error('Open a project before generating storyboard shots.')
  }

  const payload = {}
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }

  const data = await apiRequest(`/api/projects/${project_id}/generate-shots`, {
    method: 'POST',
    body: payload,
    fallbackMessage: 'Failed to generate shots',
    requireSuccess: true,
  })

  return {
    shots: data.shots ?? data.project?.shots ?? [],
    project: data.project ? mapProjectRecord(data.project) : null,
  }
}

export const generateScreenplayFromScript = generateScreenplay
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
export async function generateCharacterImage({
  project_id,
  character_id,
  character,
  force = false,
} = {}) {
  const projectId = project_id
  const characterId = character_id ?? character?.id ?? character?.db_id
  if (projectId == null || projectId === '') {
    throw new Error('Open a project before generating a character image.')
  }
  if (characterId == null || characterId === '') {
    throw new Error('Character id is required.')
  }

  const data = await apiRequest(
    `/api/projects/${projectId}/characters/${characterId}/generate-image`,
    {
      method: 'POST',
      body: force ? { force: true } : {},
      fallbackMessage: 'Failed to generate character image',
      requireSuccess: true,
    }
  )

  return {
    character: data.character ?? null,
    asset: data.asset ?? null,
    skipped: Boolean(data.skipped),
  }
}

export async function generateCharacterCostume({
  project_id,
  character_id,
  character,
  force = false,
} = {}) {
  const projectId = project_id
  const characterId = character_id ?? character?.id ?? character?.db_id
  if (projectId == null || projectId === '') {
    throw new Error('Open a project before generating a costume sheet.')
  }
  if (characterId == null || characterId === '') {
    throw new Error('Character id is required.')
  }

  const data = await apiRequest(
    `/api/projects/${projectId}/characters/${characterId}/generate-costume`,
    {
      method: 'POST',
      body: force ? { force: true } : {},
      fallbackMessage: 'Failed to generate costume sheet',
      requireSuccess: true,
    }
  )

  return {
    character: data.character ?? null,
    asset: data.asset ?? null,
    costume_image_url: data.character?.costume_image_url ?? data.asset?.image_url ?? null,
    skipped: Boolean(data.skipped),
  }
}

export async function generateProjectShotImage(
  projectId,
  shotId,
  { force = false, prompt, custom_prompt } = {}
) {
  if (projectId == null || projectId === '') {
    throw new Error('Open a project before generating a shot image.')
  }
  if (shotId == null || shotId === '') {
    throw new Error('Shot id is required.')
  }

  const adjustment = String(custom_prompt ?? prompt ?? '').trim()
  const body = {}
  if (force || adjustment) body.force = true
  if (adjustment) {
    body.prompt = adjustment
    body.custom_prompt = adjustment
  }

  const data = await apiRequest(`/api/projects/${projectId}/shots/${shotId}/generate-image`, {
    method: 'POST',
    body,
    fallbackMessage: 'Failed to generate shot image',
    requireSuccess: true,
  })

  return {
    shot: data.shot ?? null,
    image: data.image ?? null,
    skipped: Boolean(data.skipped),
  }
}

export const suggestCharacters = studioUnavailable('Character suggestions')
export const generateCharactersImages = studioUnavailable('Character generation')
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
export async function generateEnvironmentImage({
  project_id,
  environment_id,
  environment,
  force = false,
} = {}) {
  const projectId = project_id
  const environmentId = environment_id ?? environment?.id ?? environment?.db_id
  if (projectId == null || projectId === '') {
    throw new Error('Open a project before generating an environment image.')
  }
  if (environmentId == null || environmentId === '') {
    throw new Error('Environment id is required.')
  }

  const data = await apiRequest(
    `/api/projects/${projectId}/environments/${environmentId}/generate-image`,
    {
      method: 'POST',
      body: force ? { force: true } : {},
      fallbackMessage: 'Failed to generate environment image',
      requireSuccess: true,
    }
  )

  return {
    environment: data.environment ?? null,
    asset: data.asset ?? null,
    image_url: data.environment?.image_url ?? data.asset?.image_url ?? null,
    skipped: Boolean(data.skipped),
  }
}

export const generateProjectImages = studioUnavailable('Project image generation')
export const generateSceneImages = studioUnavailable('Scene image generation')
export const regenerateShotImage = studioUnavailable('Shot regeneration')
export const generateShotCandidates = studioUnavailable('Shot candidate generation')
export const selectShotCandidate = studioUnavailable('Shot candidate selection')
export const updateShot = studioUnavailable('Shot updates')
