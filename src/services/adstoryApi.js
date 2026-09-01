import { mapDirectorSuggestions } from '../storyboard/storyboardDirector'
import { markStoryboardStale } from '../storyboard/storyboardStale'
import { resolveMediaUrl } from '../utils/resolveMediaUrl'
import { apiRequest } from './api'

function noteMaterialEdit(projectId) {
  markStoryboardStale(projectId)
}

export const MIN_STORY_LENGTH = 20
export const MIN_SCRIPT_LENGTH = 20
export const MIN_SCREENPLAY_LENGTH = 20

const SCENE_GRADIENTS = [
  'linear-gradient(135deg, #0c1445 0%, #2d1b69 40%, #c45c2a 75%, #f0a050 100%)',
  'linear-gradient(135deg, #0a1628 0%, #1a3a5c 45%, #00c9a7 80%, #7bdcb5 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #38bdf8 70%, #e0f2fe 100%)',
]

export function validateStory(story) {
  const trimmed = story?.trim() ?? ''
  if (trimmed.length < MIN_STORY_LENGTH) {
    return `Story must be at least ${MIN_STORY_LENGTH} characters.`
  }
  return null
}

export function validateScript(script) {
  const trimmed = script?.trim() ?? ''
  if (!trimmed) {
    return 'Script is required.'
  }
  if (trimmed.length < MIN_SCRIPT_LENGTH) {
    return `Script must be at least ${MIN_SCRIPT_LENGTH} characters.`
  }
  return null
}

export function validateScreenplay(screenplay) {
  const trimmed = screenplay?.trim() ?? ''
  if (!trimmed) {
    return 'Screenplay is required.'
  }
  if (trimmed.length < MIN_SCREENPLAY_LENGTH) {
    return `Screenplay must be at least ${MIN_SCREENPLAY_LENGTH} characters.`
  }
  return null
}

export function mapAdstoryScenes(apiScenes = []) {
  return [...apiScenes]
    .sort(
      (a, b) =>
        (a.order_index ?? 0) - (b.order_index ?? 0) ||
        (a.scene_number ?? 0) - (b.scene_number ?? 0)
    )
    .map((scene, index) => ({
      id: scene.scene_number ?? index + 1,
      apiId: scene.id ?? null,
      scene_number: scene.scene_number ?? index + 1,
      order_index: scene.order_index ?? index,
      title: scene.title ?? `Scene ${index + 1}`,
      location: scene.location ?? '',
      time_of_day: scene.time_of_day ?? '',
      description: scene.description ?? '',
      mood: scene.mood ?? '',
      visual_style: scene.visual_style ?? '',
      characters: Array.isArray(scene.characters) ? [...scene.characters] : [],
      environment: scene.environment ?? '',
      status: scene.status ?? null,
      generation_error: scene.generation_error ?? null,
      generated_at: scene.generated_at ?? null,
      thumbGradient: SCENE_GRADIENTS[index % SCENE_GRADIENTS.length],
    }))
}

export function mapScenesToApiPayload(scenes = []) {
  return scenes.map((scene, index) => ({
    scene_number: scene.scene_number ?? scene.id ?? index + 1,
    title: scene.title ?? '',
    location: scene.location ?? '',
    time_of_day: scene.time_of_day ?? '',
    description: scene.description ?? '',
    mood: scene.mood ?? '',
    visual_style: scene.visual_style ?? '',
    characters: Array.isArray(scene.characters) ? scene.characters : [],
    environment: scene.environment ?? '',
    order_index: scene.order_index ?? index,
  }))
}

export function validateScenesForShots(scenes = []) {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return 'Add at least one scene before generating shots.'
  }
  return null
}

export function mapAdstoryShotImage(image = {}) {
  return {
    id: image.id ?? null,
    shotId: image.adstory_shot_id ?? image.shot_id ?? null,
    version_number: image.version_number ?? 1,
    image_url: image.image_url ?? '',
    thumbnail_url: image.thumbnail_url ?? image.image_url ?? '',
    prompt: image.prompt ?? '',
    is_approved: Boolean(image.is_approved),
    status: image.status ?? '',
    generation_time_ms: image.generation_time_ms ?? null,
    created_at: image.created_at ?? null,
    updated_at: image.updated_at ?? null,
  }
}

function mapShotImageList(images = []) {
  return Array.isArray(images) ? images.map(mapAdstoryShotImage) : []
}

export function deriveShotFieldsFromImages(shot, images = []) {
  const approved = images.find((image) => image.is_approved)
  const latestCompleted = [...images]
    .filter((image) => image.status === 'completed' && image.image_url)
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0]
  const imageUrl = approved?.image_url ?? latestCompleted?.image_url ?? ''

  return {
    ...shot,
    shot_images: images,
    approved_image: approved ?? null,
    image_url: imageUrl,
    image_status: imageUrl ? 'completed' : 'none',
  }
}

export function applyShotImageApiResponse(existing, data = {}) {
  const mappedShot = data.shot ? mapAdstoryShot(data.shot) : null
  let next = mappedShot ? mergeAdstoryShotUpdate(existing, data.shot) : { ...existing }

  const mappedImages = mapShotImageList(data.images ?? data.versions)
  if (mappedImages.length > 0) {
    next = { ...next, shot_images: mappedImages }
  } else if (data.image) {
    const mappedImage = mapAdstoryShotImage(data.image)
    const current = next.shot_images ?? []
    const index = current.findIndex((item) => String(item.id) === String(mappedImage.id))
    next = {
      ...next,
      shot_images:
        index >= 0
          ? current.map((item, itemIndex) => (itemIndex === index ? mappedImage : item))
          : [...current, mappedImage],
    }
  }

  if (data.image?.image_url) {
    next = { ...next, image_url: data.image.image_url }
  }

  if (mappedShot?.approved_image) {
    next = { ...next, approved_image: mappedShot.approved_image }
  }

  if (mappedShot?.image_url) {
    next = { ...next, image_url: mappedShot.image_url }
  }

  if (mappedShot?.image_status) {
    next = { ...next, image_status: mappedShot.image_status }
  }

  return next
}

export function mapAdstoryShot(shot = {}, options = {}) {
  const { sceneNumber = null, indexInScene = 0 } = options
  const apiId = shot.id ?? null
  const resolvedScene = sceneNumber ?? shot.scene_number ?? null
  const shotNumber =
    shot.shot_number ??
    (apiId != null ? String(apiId) : String(indexInScene + 1))
  const id =
    apiId != null
      ? String(apiId)
      : `${resolvedScene ?? 'scene'}-${shot.order_index ?? indexInScene}-${shotNumber}`
  const shotImages = mapShotImageList(shot.images ?? shot.shot_images)
  const approvedImage = shot.approved_image ? mapAdstoryShotImage(shot.approved_image) : null
  const latestCompleted = [...shotImages]
    .filter((image) => image.status === 'completed' && image.image_url)
    .sort((a, b) => (b.version_number ?? 0) - (a.version_number ?? 0))[0]
  const approvedUrl =
    approvedImage?.image_url ?? shot.image_url ?? latestCompleted?.image_url ?? ''
  let imageStatus =
    shot.image_status ??
    (approvedImage?.is_approved || approvedUrl ? 'completed' : shotImages.length ? 'pending' : 'none')
  if (
    approvedUrl &&
    imageStatus !== 'failed' &&
    imageStatus !== 'generating' &&
    imageStatus !== 'queued'
  ) {
    imageStatus = 'completed'
  }

  return {
    id,
    apiId,
    shot_number: shotNumber,
    scene_number: shot.scene_number ?? null,
    sceneApiId: shot.adstory_scene_id ?? shot.scene_id ?? null,
    title: shot.title ?? '',
    description: shot.description ?? '',
    action: shot.action ?? '',
    dialogue: shot.dialogue ?? '',
    shotSize: shot.shot_size ?? '',
    cameraAngle: shot.camera_angle ?? '',
    cameraMovement: shot.camera_movement ?? '',
    composition: shot.composition ?? '',
    lens: shot.lens ?? '',
    lighting: shot.lighting ?? '',
    mood: shot.mood ?? '',
    characters: Array.isArray(shot.characters) ? [...shot.characters] : [],
    environment: shot.environment ?? '',
    durationSeconds: shot.duration_seconds ?? null,
    camera: shot.camera_movement ?? shot.camera ?? '',
    prompt: shot.prompt ?? '',
    order_index: shot.order_index ?? 0,
    shot_images: shotImages,
    approved_image: approvedImage,
    image_url: approvedUrl,
    imageUrl: approvedUrl,
    image_status: imageStatus,
    imageStatus,
    generation_error: shot.generation_error ?? shot.generationError ?? null,
    updated_at: shot.updated_at ?? null,
    composition_preset: shot.composition_preset ?? null,
    cinematography_preset: shot.cinematography_preset ?? null,
    lighting_preset: shot.lighting_preset ?? null,
    selected_character_assets: Array.isArray(shot.selected_character_assets)
      ? [...shot.selected_character_assets]
      : [],
    selected_environment_assets: Array.isArray(shot.selected_environment_assets)
      ? [...shot.selected_environment_assets]
      : [],
    storyboard_settings:
      shot.storyboard_settings && typeof shot.storyboard_settings === 'object'
        ? { ...shot.storyboard_settings }
        : null,
    meta: shot.meta && typeof shot.meta === 'object' ? { ...shot.meta } : {},
  }
}

export function mergeAdstoryShotUpdate(existing, apiShot) {
  const mapped = mapAdstoryShot(apiShot)

  return {
    ...existing,
    ...mapped,
    id: existing.id ?? mapped.id,
    apiId: mapped.apiId ?? existing.apiId,
  }
}

export function mapAdstoryShots(apiShots = [], scenes = []) {
  const sceneByNumber = new Map(
    scenes.map((scene) => [scene.scene_number ?? scene.id, scene])
  )
  const sceneByApiId = new Map(
    scenes.filter((scene) => scene.apiId != null).map((scene) => [scene.apiId, scene])
  )
  const groups = new Map()

  const sortedShots = [...apiShots].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || (a.id ?? 0) - (b.id ?? 0)
  )

  for (const shot of sortedShots) {
    const sceneFromApi = sceneByApiId.get(shot.adstory_scene_id ?? shot.scene_id)
    const sceneNumber = shot.scene_number ?? sceneFromApi?.scene_number ?? sceneFromApi?.id ?? 1

    if (!groups.has(sceneNumber)) {
      const scene = sceneByNumber.get(sceneNumber) ?? sceneFromApi
      groups.set(sceneNumber, {
        sceneId: sceneNumber,
        sceneApiId: scene?.apiId ?? shot.adstory_scene_id ?? shot.scene_id ?? null,
        sceneTitle: scene?.title ?? shot.scene_title ?? `Scene ${sceneNumber}`,
        shots: [],
      })
    }

    groups.get(sceneNumber).shots.push(
      mapAdstoryShot(shot, { sceneNumber, indexInScene: groups.get(sceneNumber).shots.length })
    )
  }

  return [...groups.values()].sort((a, b) => a.sceneId - b.sceneId)
}

export function mapShotsToApiPayload(shotGroups = []) {
  const shots = []
  let orderIndex = 0

  for (const group of shotGroups) {
    for (const shot of group.shots ?? []) {
      shots.push({
        adstory_scene_id: shot.sceneApiId ?? group.sceneApiId ?? null,
        scene_number: group.sceneId ?? shot.scene_number ?? null,
        scene_title: group.sceneTitle ?? null,
        shot_number: shot.shot_number ?? shot.id,
        title: shot.title ?? '',
        description: shot.description ?? '',
        action: shot.action ?? '',
        dialogue: shot.dialogue ?? '',
        shot_size: shot.shotSize ?? '',
        camera_angle: shot.cameraAngle ?? '',
        camera_movement: shot.cameraMovement ?? shot.camera ?? '',
        composition: shot.composition ?? '',
        lens: shot.lens ?? '',
        lighting: shot.lighting ?? '',
        environment: shot.environment ?? '',
        characters: Array.isArray(shot.characters) ? shot.characters : [],
        duration_seconds:
          shot.durationSeconds != null && shot.durationSeconds !== ''
            ? Number.parseInt(String(shot.durationSeconds), 10)
            : null,
        mood: shot.mood ?? '',
        prompt: shot.prompt ?? '',
        order_index: shot.order_index ?? orderIndex,
      })
      orderIndex += 1
    }
  }

  return shots
}

async function postAdstory(endpoint, payload, fallbackMessage) {
  return apiRequest(endpoint, {
    method: 'POST',
    payload,
    fallbackMessage,
    auth: true,
    sanitize: true,
    requireSuccess: true,
  })
}

async function requestAdstory(endpoint, { method = 'GET', payload, fallbackMessage } = {}) {
  return apiRequest(endpoint, {
    method,
    payload,
    fallbackMessage,
    auth: true,
    sanitize: true,
    requireSuccess: true,
    cacheSceneboardGet: true,
  })
}

/**
 * Maps an Adstory project API record into the shape used by mapApiResponseToProjectState.
 */
export function mapAdstoryProjectToApiShape(project = {}) {
  const visualStyle = project.visual_style ?? project.style ?? null

  return {
    id: project.id,
    title: project.title ?? '',
    story: project.story ?? project.story_text ?? '',
    script: project.script ?? '',
    screenplay: project.screenplay ?? '',
    meta: {
      visual_style: visualStyle,
      ...(project.meta ?? {}),
    },
    story_status: project.story_status ?? null,
    current_step: project.current_step ?? null,
    status: project.status ?? null,
    scene_generation_status: project.scene_generation_status ?? null,
    scene_generation_total: project.scene_generation_total ?? 0,
    scene_generation_completed: project.scene_generation_completed ?? 0,
    scene_generation_failed: project.scene_generation_failed ?? 0,
    scene_generation_started_at: project.scene_generation_started_at ?? null,
    scene_generation_finished_at: project.scene_generation_finished_at ?? null,
    shot_generation_status: project.shot_generation_status ?? null,
    shot_generation_total: project.shot_generation_total ?? 0,
    shot_generation_completed: project.shot_generation_completed ?? 0,
    shot_generation_failed: project.shot_generation_failed ?? 0,
    shot_generation_started_at: project.shot_generation_started_at ?? null,
    shot_generation_finished_at: project.shot_generation_finished_at ?? null,
    character_generation_status: project.character_generation_status ?? null,
    character_generation_total: project.character_generation_total ?? 0,
    character_generation_completed: project.character_generation_completed ?? 0,
    character_generation_failed: project.character_generation_failed ?? 0,
    character_generation_started_at: project.character_generation_started_at ?? null,
    character_generation_finished_at: project.character_generation_finished_at ?? null,
    environment_generation_status: project.environment_generation_status ?? null,
    environment_generation_total: project.environment_generation_total ?? 0,
    environment_generation_completed: project.environment_generation_completed ?? 0,
    environment_generation_failed: project.environment_generation_failed ?? 0,
    environment_generation_started_at: project.environment_generation_started_at ?? null,
    environment_generation_finished_at: project.environment_generation_finished_at ?? null,
    scenes: [],
    shots: [],
    characters: [],
    environments: [],
    objects: [],
    updated_at: project.updated_at ?? null,
  }
}

export async function ensureProjectCoverImage(projectId, { force = false } = {}) {
  if (projectId == null || projectId === '') {
    throw new Error('Open a project before generating a cover image.')
  }

  const data = await requestAdstory(`/api/adstory/projects/${projectId}/generate-cover`, {
    method: 'POST',
    payload: { force: Boolean(force) },
    fallbackMessage: 'Failed to generate project cover',
  })

  return {
    cover_image_url: data.cover_image_url ?? data.project?.cover_image_url ?? null,
    generated: Boolean(data.generated),
    skipped: Boolean(data.skipped),
    project: data.project ?? null,
  }
}

export async function getProjectScenes(projectId) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/scenes`, {
    fallbackMessage: 'Failed to load scenes',
  })

  return mapAdstoryScenes(data.scenes ?? [])
}

export function mapSceneGenerationProgress(data = {}) {
  const scenes = mapAdstoryScenes(data.scenes ?? [])
  const total = data.total ?? scenes.length
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0
  const remaining =
    data.remaining ?? Math.max(0, total - completed - failed)

  return {
    status: data.status ?? null,
    total,
    completed,
    failed,
    remaining,
    progress_percent: data.progress_percent ?? null,
    stalled: Boolean(data.stalled),
    currentScene: data.current_scene ?? null,
    scenes,
    project: data.project ? mapAdstoryProjectToApiShape(data.project) : null,
  }
}

export async function startSceneGeneration(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before starting scene generation.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/scenes/start-generation`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to start scene generation',
    }
  )

  return mapSceneGenerationProgress({
    ...data.progress,
    status: data.progress?.status ?? data.project?.scene_generation_status ?? 'running',
    scenes: data.scenes ?? data.progress?.scenes ?? [],
    project: data.project,
  })
}

export async function getSceneGenerationProgress(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before loading scene generation progress.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/scenes/progress`,
    {
      fallbackMessage: 'Failed to load scene generation progress',
    }
  )

  return mapSceneGenerationProgress(data)
}

export async function resumeSceneGeneration(projectId, { retry_failed = false } = {}) {
  if (projectId == null) {
    throw new Error('Open a project before resuming scene generation.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/scenes/resume-generation`,
    {
      method: 'POST',
      payload: { retry_failed },
      fallbackMessage: 'Failed to resume scene generation',
    }
  )

  return mapSceneGenerationProgress(data.progress ?? data)
}

export async function cancelSceneGeneration(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before cancelling scene generation.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/scenes/cancel-generation`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to cancel scene generation',
    }
  )

  return mapSceneGenerationProgress(data.progress ?? data)
}

export async function createProjectScene(projectId, sceneData = {}) {
  const payload = {
    title: sceneData.title ?? '',
    description: sceneData.description ?? '',
    location: sceneData.location ?? '',
    time_of_day: sceneData.time_of_day ?? '',
    mood: sceneData.mood ?? '',
    visual_style: sceneData.visual_style ?? '',
  }

  if (sceneData.position) {
    payload.position = sceneData.position
  }
  if (sceneData.reference_scene_id != null) {
    payload.reference_scene_id = sceneData.reference_scene_id
  }

  const data = await requestAdstory(`/api/adstory/projects/${projectId}/scenes`, {
    method: 'POST',
    payload,
    fallbackMessage: 'Failed to create scene',
  })

  const scenes = mapSceneboardScenesFromApi(data.scene ? [data.scene] : [])
  noteMaterialEdit(projectId)
  return scenes[0] ?? null
}

export async function updateProjectScene(projectId, sceneId, sceneData = {}) {
  const payload = {
    title: sceneData.title ?? '',
    description: sceneData.description ?? '',
    location: sceneData.location ?? '',
    time_of_day: sceneData.time_of_day ?? '',
    mood: sceneData.mood ?? '',
    visual_style: sceneData.visual_style ?? '',
    environment: sceneData.environment ?? '',
  }

  const data = await requestAdstory(`/api/adstory/projects/${projectId}/scenes/${sceneId}`, {
    method: 'PUT',
    payload,
    fallbackMessage: 'Failed to update scene',
  })

  const scenes = mapSceneboardScenesFromApi(data.scene ? [data.scene] : [])
  noteMaterialEdit(projectId)
  return scenes[0] ?? null
}

export async function deleteProjectScene(projectId, sceneId, { force = false } = {}) {
  const path = force
    ? `/api/adstory/projects/${projectId}/scenes/${sceneId}?force=true`
    : `/api/adstory/projects/${projectId}/scenes/${sceneId}`

  await requestAdstory(path, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete scene',
  })
  noteMaterialEdit(projectId)
}

export async function saveProjectScenesBulk(projectId, scenes = [], { visual_style } = {}) {
  const payload = {
    scenes: mapScenesToApiPayload(scenes),
  }

  if (visual_style?.trim()) {
    payload.visual_style = visual_style.trim().slice(0, 255)
  }

  const data = await requestAdstory(`/api/adstory/projects/${projectId}/scenes/bulk`, {
    method: 'PUT',
    payload,
    fallbackMessage: 'Failed to save scenes',
  })

  noteMaterialEdit(projectId)
  return mapAdstoryScenes(data.scenes ?? [])
}

export async function getProjectShots(projectId, scenes = []) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/shots`, {
    fallbackMessage: 'Failed to load shots',
  })

  const shotGroups = mapAdstoryShots(data.shots ?? [], scenes)

  return {
    shots: data.shots ?? [],
    shotGroups,
    groupedByScene: data.grouped_by_scene ?? [],
  }
}

export function mapCharacterGenerationProgress(data = {}) {
  const apiCharacters = data.characters ?? []
  const total = data.total ?? 0
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0
  const remaining = data.remaining ?? Math.max(0, total - completed - failed)

  return {
    status: data.status ?? null,
    phase: data.phase ?? null,
    total,
    completed,
    failed,
    remaining,
    running: data.running ?? 0,
    queued: data.queued ?? 0,
    progress_percent: data.progress_percent ?? null,
    estimated_remaining_seconds: data.estimated_remaining ?? data.estimated_remaining_seconds ?? null,
    stalled: Boolean(data.stalled),
    currentCharacter: data.current_character ?? null,
    extraction: data.extraction ?? null,
    tasks: data.tasks ?? null,
    characters: apiCharacters,
    project: data.project ? mapAdstoryProjectToApiShape(data.project) : null,
    started: data.started ?? null,
  }
}

export async function getCharacterGenerationProgress(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before loading character generation progress.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/characters/progress`,
    {
      fallbackMessage: 'Failed to load character generation progress',
    }
  )

  return mapCharacterGenerationProgress(data)
}

export async function resumeCharacterGeneration(projectId, { retry_failed = false, style } = {}) {
  if (projectId == null) {
    throw new Error('Open a project before resuming character generation.')
  }

  const payload = {}
  if (retry_failed) payload.retry_failed = true
  if (style?.trim()) payload.style = style.trim().slice(0, 255)

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/characters/resume-generation`,
    {
      method: 'POST',
      payload,
      fallbackMessage: 'Failed to resume character generation',
    }
  )

  return mapCharacterGenerationProgress(data.progress ?? data)
}

export async function cancelCharacterGeneration(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before cancelling character generation.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/characters/cancel-generation`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to cancel character generation',
    }
  )

  return mapCharacterGenerationProgress(data.progress ?? data)
}

export function mapEnvironmentGenerationProgress(data = {}) {
  const apiEnvironments = mapAdstoryEnvironments(data.environments ?? [])
  const total = data.total ?? 0
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0
  const remaining = data.remaining ?? Math.max(0, total - completed - failed)

  return {
    status: data.status ?? null,
    phase: data.phase ?? null,
    total,
    completed,
    failed,
    remaining,
    running: data.running ?? 0,
    queued: data.queued ?? 0,
    progress_percent: data.progress_percent ?? null,
    estimated_remaining_seconds:
      data.estimated_remaining ?? data.estimated_remaining_seconds ?? null,
    stalled: Boolean(data.stalled),
    currentEnvironment: data.current_environment ?? null,
    failedEnvironments: data.failed_environments ?? [],
    extraction: data.extraction ?? null,
    tasks: data.tasks ?? null,
    environments: apiEnvironments,
    project: data.project ? mapAdstoryProjectToApiShape(data.project) : null,
    started: data.started ?? null,
  }
}

export async function startEnvironmentGeneration(projectId, { style } = {}) {
  if (projectId == null) {
    throw new Error('Open a project before starting environment generation.')
  }

  const payload = {}
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 255)
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/environments/start-generation`,
    {
      method: 'POST',
      payload,
      fallbackMessage: 'Failed to start environment generation',
    }
  )

  return mapEnvironmentGenerationProgress(data)
}

export async function getEnvironmentGenerationProgress(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before loading environment generation progress.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/environments/progress`,
    {
      fallbackMessage: 'Failed to load environment generation progress',
    }
  )

  return mapEnvironmentGenerationProgress(data)
}

export async function retryEnvironmentGeneration(projectId, environmentId) {
  if (projectId == null) {
    throw new Error('Open a project before retrying environment generation.')
  }
  if (environmentId == null) {
    throw new Error('Environment id is required.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/environments/${environmentId}/retry`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to retry environment generation',
    }
  )

  return mapEnvironmentGenerationProgress(data)
}

export async function resumeEnvironmentGeneration(projectId, { retry_failed = false } = {}) {
  if (projectId == null) {
    throw new Error('Open a project before resuming environment generation.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/environments/resume-generation`,
    {
      method: 'POST',
      payload: { retry_failed },
      fallbackMessage: 'Failed to resume environment generation',
    }
  )

  return mapEnvironmentGenerationProgress(data.progress ?? data)
}

export async function cancelEnvironmentGeneration(projectId) {
  if (projectId == null) {
    throw new Error('Open a project before cancelling environment generation.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/environments/cancel-generation`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to cancel environment generation',
    }
  )

  return mapEnvironmentGenerationProgress(data.progress ?? data)
}

export async function getProjectSceneboard(projectId) {
  const key = String(projectId)

  const inflight = sceneboardFetchInflight.get(key)
  if (inflight) {
    return inflight
  }

  const coolUntil = sceneboardFetchCooldownUntil.get(key) ?? 0
  if (Date.now() < coolUntil && sceneboardLastResult.has(key)) {
    return sceneboardLastResult.get(key)
  }

  const request = (async () => {
    try {
      const data = await requestAdstory(`/api/adstory/projects/${projectId}/sceneboard`, {
        fallbackMessage: 'Failed to load sceneboard',
      })

      const mapped = {
        scenes: mapSceneboardScenesFromApi(data.scenes ?? []),
        summary: data.summary ?? null,
      }
      sceneboardLastResult.set(key, mapped)
      sceneboardFetchCooldownUntil.set(key, Date.now() + SCENEBOARD_FETCH_COOLDOWN_MS)
      return mapped
    } finally {
      sceneboardFetchInflight.delete(key)
    }
  })()

  sceneboardFetchInflight.set(key, request)
  return request
}

function mapStoryboardSceneFromApi(scene = {}) {
  return {
    apiId: scene.id ?? scene.apiId ?? null,
    scene_number: scene.scene_number ?? scene.id ?? null,
    title: scene.title ?? '',
    description: scene.description ?? '',
    location: scene.location ?? '',
    time_of_day: scene.time_of_day ?? '',
    mood: scene.mood ?? '',
    shotCount: scene.shots_count ?? scene.shot_count ?? scene.shotCount ?? 0,
    shotGenerationStatus: scene.shot_generation_status ?? scene.shotGenerationStatus ?? 'not_started',
    shotGenerationError: scene.shot_generation_error ?? scene.shotGenerationError ?? null,
    status: scene.status ?? null,
  }
}

function mapStoryboardScenesFromApi(scenes = []) {
  return [...scenes]
    .sort(
      (a, b) =>
        (a.order_index ?? 0) - (b.order_index ?? 0) ||
        (a.scene_number ?? 0) - (b.scene_number ?? 0)
    )
    .map(mapStoryboardSceneFromApi)
}

function mapStoryboardShotProgressResponse(data = {}) {
  const sceneRaw = data.scene ?? {}
  const scene = mapStoryboardSceneFromApi(sceneRaw)
  const shots = (data.shots ?? []).map((shot, index) =>
    mapAdstoryShot(shot, { sceneNumber: scene.scene_number, indexInScene: index })
  )

  const status = data.shot_generation_status ?? scene.shotGenerationStatus ?? null
  const total = data.total ?? 0
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0

  return {
    status,
    total,
    completed,
    failed,
    remaining: data.remaining ?? Math.max(0, total - completed - failed),
    progress_percent: data.progress_percent ?? null,
    currentShot: data.current_shot ?? null,
    scene,
    shots,
    started: data.started ?? null,
    startedGeneration: Boolean(data.started),
  }
}

export async function getProjectStoryboard(projectId) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/storyboard`, {
    fallbackMessage: 'Failed to load storyboard',
  })

  return {
    project: data.project ?? null,
    scenes: mapStoryboardScenesFromApi(data.scenes ?? []),
  }
}

export async function getStoryboardScene(projectId, sceneId) {
  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}`,
    { fallbackMessage: 'Failed to load storyboard scene' }
  )

  const scene = mapStoryboardSceneFromApi(data.scene ?? {})
  const shots = (data.shots ?? []).map((shot, index) =>
    mapAdstoryShot(shot, { sceneNumber: scene.scene_number, indexInScene: index })
  )

  return {
    scene,
    shots,
    characters: data.characters ?? [],
    environments: data.environments ?? [],
  }
}

export async function startStoryboardSceneShotGeneration(
  projectId,
  sceneId,
  { style, force = false } = {}
) {
  const payload = {}
  if (style?.trim()) payload.style = style.trim().slice(0, 255)
  if (force) payload.force = true

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/generate-shots`,
    {
      method: 'POST',
      payload,
      fallbackMessage: 'Failed to start shot generation',
    }
  )

  return mapStoryboardShotProgressResponse(data)
}

export async function getStoryboardSceneShotProgress(projectId, sceneId) {
  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/shots/progress`,
    { fallbackMessage: 'Failed to load shot generation progress' }
  )

  return mapStoryboardShotProgressResponse(data)
}

export async function cancelStoryboardSceneShotGeneration(projectId, sceneId) {
  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/shots/cancel`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to cancel shot generation',
    }
  )

  return mapStoryboardShotProgressResponse(data)
}

function mapStoryboardShotImageProgressResponse(data = {}) {
  const sceneRaw = data.scene ?? {}
  const scene = sceneRaw.id != null || sceneRaw.scene_number != null
    ? mapStoryboardSceneFromApi(sceneRaw)
    : null

  const shots = (data.shots ?? data.updated_shots ?? []).map((shot, index) =>
    mapAdstoryShot(shot, {
      sceneNumber: scene?.scene_number ?? shot.scene_number,
      indexInScene: index,
    })
  )

  const total = data.total ?? data.total_shots ?? 0
  const completed = data.completed ?? 0
  const failed = data.failed ?? 0
  const remaining = data.remaining ?? Math.max(0, total - completed - failed)

  return {
    status: data.status ?? data.image_generation_status ?? null,
    total,
    completed,
    failed,
    remaining,
    progress_percent: data.progress_percent ?? null,
    stalled: Boolean(data.stalled),
    estimated_remaining:
      data.estimated_remaining ??
      data.estimatedRemaining ??
      (remaining > 0 ? remaining * 45 : 0),
    currentShot: data.current_shot ?? data.currentShot ?? null,
    scene,
    shots,
    started: data.started ?? null,
    startedGeneration: Boolean(data.started ?? data.started_generation),
    resumed: Boolean(data.resumed),
  }
}

export async function resumeStoryboardSceneShotImageGeneration(
  projectId,
  sceneId,
  { retryFailed = false, style } = {}
) {
  const payload = {}
  if (retryFailed) payload.retry_failed = true
  if (style?.trim()) payload.style = style.trim().slice(0, 255)

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/shot-images/resume`,
    {
      method: 'POST',
      payload,
      fallbackMessage: 'Failed to resume scene image generation',
    }
  )

  return mapStoryboardShotImageProgressResponse(data)
}

export async function startStoryboardSceneShotImageGeneration(projectId, sceneId, { force = false } = {}) {
  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/generate-all-shot-images`,
    {
      method: 'POST',
      payload: force ? { force: true } : {},
      fallbackMessage: 'Failed to start scene image generation',
    }
  )

  return mapStoryboardShotImageProgressResponse(data)
}

export async function getStoryboardSceneShotImageProgress(projectId, sceneId) {
  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/shot-images/progress`,
    { fallbackMessage: 'Failed to load scene image generation progress' }
  )

  return mapStoryboardShotImageProgressResponse(data)
}

export async function cancelStoryboardSceneShotImageGeneration(projectId, sceneId) {
  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/storyboard/scenes/${sceneId}/shot-images/cancel`,
    {
      method: 'POST',
      payload: {},
      fallbackMessage: 'Failed to cancel image generation',
    }
  )

  return {
    ...mapStoryboardShotImageProgressResponse(data),
    cancelled: Boolean(data.cancelled),
    tasks_cancelled: data.tasks_cancelled ?? 0,
  }
}

function mapSceneboardScenesFromApi(scenes = []) {
  return [...scenes]
    .sort(
      (a, b) =>
        (a.order_index ?? 0) - (b.order_index ?? 0) ||
        (a.scene_number ?? 0) - (b.scene_number ?? 0)
    )
    .map((scene) => ({
      ...mapAdstoryScenes([scene])[0],
      shotCount: scene.shot_count ?? scene.shots_count ?? 0,
      shotGenerationStatus: scene.shot_generation_status ?? null,
      shotGenerationError: scene.shot_generation_error ?? null,
      estimatedDuration: scene.estimated_duration ?? null,
      aiNotes: scene.ai_notes ?? '',
    }))
}

export async function createProjectShot(projectId, shotData = {}) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/shots`, {
    method: 'POST',
    payload: shotData,
    fallbackMessage: 'Failed to create shot',
  })

  return data.shot ? mapAdstoryShot(data.shot) : null
}

export async function updateProjectShot(projectId, shotId, shotData = {}) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/shots/${shotId}`, {
    method: 'PUT',
    payload: shotData,
    fallbackMessage: 'Failed to update shot',
  })

  return data.shot ? mapAdstoryShot(data.shot) : null
}

export async function deleteProjectShot(projectId, shotId) {
  await requestAdstory(`/api/adstory/projects/${projectId}/shots/${shotId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete shot',
  })
}

export async function saveProjectShotsBulk(projectId, shotGroups = [], scenes = []) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/shots/bulk`, {
    method: 'PUT',
    payload: {
      shots: mapShotsToApiPayload(shotGroups),
    },
    fallbackMessage: 'Failed to save shots',
  })

  return mapAdstoryShots(data.shots ?? [], scenes)
}

export async function generateShotsFromScenes({ scenes, style, project_id }) {
  const validationError = validateScenesForShots(scenes)
  if (validationError) {
    throw new Error(validationError)
  }

  const payload = {
    scenes: mapScenesToApiPayload(scenes),
  }
  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }
  if (project_id != null) {
    payload.project_id = project_id
  }

  const data = await postAdstory(
    '/api/adstory/generate-shots',
    payload,
    'Failed to generate shots'
  )

  return {
    shotGroups: mapAdstoryShots(data.shots ?? [], scenes),
    project: data.project ? mapAdstoryProjectToApiShape(data.project) : null,
  }
}

export async function getShotImages(projectId, shotId) {
  if (projectId == null) {
    throw new Error('Open a project before loading shot images.')
  }
  if (shotId == null) {
    throw new Error('Shot id is required.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/shots/${shotId}/images`,
    { fallbackMessage: 'Failed to load shot images' }
  )

  return mapShotImageList(data.images ?? [])
}

export async function generateShotImage(projectId, shotId, options = {}) {
  if (typeof projectId === 'object' && projectId !== null) {
    const legacy = projectId
    return generateShotImage(legacy.project_id, legacy.shot_id, options)
  }

  if (projectId == null) {
    throw new Error('Open a project before generating a shot image.')
  }
  if (shotId == null) {
    throw new Error('Shot id is required.')
  }

  const payload = {}
  if (options.prompt?.trim()) {
    payload.prompt = options.prompt.trim()
  }
  if (options.custom_prompt?.trim()) {
    payload.custom_prompt = options.custom_prompt.trim()
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/shots/${shotId}/generate-image`,
    {
      method: 'POST',
      payload: Object.keys(payload).length > 0 ? payload : {},
      fallbackMessage: 'Failed to generate shot image',
    }
  )

  return {
    shot: data.shot ?? null,
    image: data.image ? mapAdstoryShotImage(data.image) : null,
    images: mapShotImageList(data.images ?? data.versions),
    versions: mapShotImageList(data.versions ?? data.images),
  }
}

export async function approveShotImage(projectId, shotId, imageId) {
  if (
    shotId == null &&
    imageId == null &&
    projectId != null &&
    typeof projectId !== 'object'
  ) {
    const legacyImageId = projectId
    const data = await requestAdstory(`/api/adstory/shot-images/${legacyImageId}/approve`, {
      method: 'PUT',
      fallbackMessage: 'Failed to approve shot image',
    })

    return {
      shot: data.shot ?? null,
      image: data.image ? mapAdstoryShotImage(data.image) : null,
      images: mapShotImageList(data.images ?? data.versions),
      versions: mapShotImageList(data.versions ?? data.images),
    }
  }

  if (projectId == null) {
    throw new Error('Open a project before approving a shot image.')
  }
  if (shotId == null) {
    throw new Error('Shot id is required.')
  }
  if (imageId == null) {
    throw new Error('Image id is required.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/shots/${shotId}/images/${imageId}/approve`,
    {
      method: 'PUT',
      fallbackMessage: 'Failed to approve shot image',
    }
  )

  return {
    shot: data.shot ?? null,
    image: data.image ? mapAdstoryShotImage(data.image) : null,
    images: mapShotImageList(data.images ?? data.versions),
    versions: mapShotImageList(data.versions ?? data.images),
  }
}

export async function deleteShotImage(projectId, shotId, imageId) {
  if (projectId == null) {
    throw new Error('Open a project before deleting a shot image.')
  }
  if (shotId == null) {
    throw new Error('Shot id is required.')
  }
  if (imageId == null) {
    throw new Error('Image id is required.')
  }

  await requestAdstory(
    `/api/adstory/projects/${projectId}/shots/${shotId}/images/${imageId}`,
    {
      method: 'DELETE',
      fallbackMessage: 'Failed to delete shot image',
    }
  )

  const images = await getShotImages(projectId, shotId)

  return { images }
}

export function mapAdstoryCharacterAsset(asset = {}) {
  return {
    id: asset.id ?? null,
    characterId: asset.adstory_character_id ?? asset.character_id ?? null,
    asset_type: asset.asset_type ?? '',
    title: asset.title ?? '',
    image_url: asset.image_url ?? '',
    is_primary: Boolean(asset.is_primary),
    status: asset.status ?? '',
    meta: asset.meta && typeof asset.meta === 'object' ? { ...asset.meta } : {},
  }
}

export function mapAdstoryEnvironmentAsset(asset = {}) {
  return {
    id: asset.id ?? null,
    environmentId: asset.adstory_environment_id ?? asset.environment_id ?? null,
    asset_type: asset.asset_type ?? '',
    title: asset.title ?? '',
    image_url: asset.image_url ?? '',
    is_primary: Boolean(asset.is_primary),
    status: asset.status ?? '',
    meta: asset.meta && typeof asset.meta === 'object' ? { ...asset.meta } : {},
  }
}

export function mapStoryboardSettingsFromApiShot(apiShot = {}) {
  return {
    composition_preset: apiShot.composition_preset ?? null,
    cinematography_preset: apiShot.cinematography_preset ?? null,
    lighting_preset: apiShot.lighting_preset ?? null,
    selected_character_assets: Array.isArray(apiShot.selected_character_assets)
      ? [...apiShot.selected_character_assets]
      : [],
    selected_environment_assets: Array.isArray(apiShot.selected_environment_assets)
      ? [...apiShot.selected_environment_assets]
      : [],
    storyboard_settings:
      apiShot.storyboard_settings && typeof apiShot.storyboard_settings === 'object'
        ? { ...apiShot.storyboard_settings }
        : null,
    shot_images: mapShotImageList(apiShot.images ?? apiShot.shot_images),
    image_url: apiShot.image_url ?? null,
    image_status: apiShot.image_status ?? null,
    updated_at: apiShot.updated_at ?? null,
  }
}

export function applyStoryboardSettingsToStudioShot(existingShot, apiShot) {
  const settings = mapStoryboardSettingsFromApiShot(apiShot)
  const mapped = apiShot ? mapAdstoryShot(apiShot) : {}

  return {
    ...existingShot,
    ...settings,
    label: mapped.title ?? existingShot.label,
    description: mapped.description ?? existingShot.description,
    previewImage: mapped.image_url
      ? resolveMediaUrl(mapped.image_url)
      : existingShot.previewImage,
    imageUrl: mapped.image_url ?? existingShot.imageUrl,
    imageStatus: mapped.image_status ?? existingShot.imageStatus,
    imageUpdatedAt: mapped.updated_at ?? existingShot.imageUpdatedAt,
  }
}

export async function updateShotStoryboardSettings(projectId, shotId, payload = {}) {
  if (projectId == null) {
    throw new Error('Open a project before saving storyboard settings.')
  }
  if (shotId == null) {
    throw new Error('Shot id is required.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/shots/${shotId}/storyboard-settings`,
    {
      method: 'PUT',
      payload,
      fallbackMessage: 'Failed to save storyboard settings',
    }
  )

  return {
    shot: data.shot ?? null,
  }
}

export async function askShotDirector(projectId, shotId, instruction) {
  if (projectId == null) {
    throw new Error('Open a project before asking the director.')
  }
  if (shotId == null) {
    throw new Error('Shot id is required.')
  }

  const trimmed = String(instruction ?? '').trim()
  if (trimmed.length < 3) {
    throw new Error('Director instruction must be at least 3 characters.')
  }

  const data = await requestAdstory(
    `/api/adstory/projects/${projectId}/shots/${shotId}/director`,
    {
      method: 'POST',
      payload: { instruction: trimmed },
      fallbackMessage: 'Failed to get director suggestions',
    }
  )

  return mapDirectorSuggestions(data)
}

export function isBackendCharacterId(id) {
  if (id == null || id === '') return false
  return /^\d+$/.test(String(id))
}

export function mapAdstoryCharacter(character = {}, index = 0) {
  const appearance = character.appearance
  const isAppearanceObject =
    appearance && typeof appearance === 'object' && !Array.isArray(appearance)
  const assets = Array.isArray(character.assets)
    ? character.assets.map(mapAdstoryCharacterAsset)
    : []
  const primaryAsset =
    assets.find((asset) => asset.is_primary && asset.image_url) ??
    assets.find((asset) => asset.image_url) ??
    null
  const imageUrl =
    character.image_url ??
    character.hero_image_url ??
    character.heroImageUrl ??
    primaryAsset?.image_url ??
    ''

  const costumeAsset =
    assets.find((asset) => asset.asset_type === 'costume' && asset.image_url) ?? null
  const costumeUrl = character.costume_image_url ?? costumeAsset?.image_url ?? ''

  return {
    id: character.id ?? `character-${index + 1}`,
    db_id: character.db_id ?? (isBackendCharacterId(character.id) ? Number(character.id) : null),
    name: character.name ?? 'Unnamed character',
    role: character.role ?? '',
    gender: character.gender ?? '',
    age: character.age ?? character.age_range ?? '',
    description: character.description ?? '',
    personality: character.personality ?? '',
    appearance: isAppearanceObject
      ? (appearance.physical ?? '')
      : typeof appearance === 'string'
        ? appearance
        : '',
    wardrobe:
      character.wardrobe ??
      character.clothing ??
      (isAppearanceObject ? (appearance.clothing ?? '') : ''),
    importance: character.importance ?? '',
    image_url: imageUrl,
    costume_image_url: costumeUrl,
    image_status:
      character.image_status ??
      character.imageStatus ??
      (imageUrl ? 'completed' : 'pending'),
    prompt: character.prompt ?? '',
    references: character.references ?? character.reference_images ?? [],
    assets,
    status: character.status ?? 'suggested',
    order_index: character.order_index ?? index,
  }
}

export function mapAdstoryCharacters(apiCharacters = []) {
  return apiCharacters.map((character, index) => mapAdstoryCharacter(character, index))
}

export function mergeAdstoryCharacterUpdate(existing, result = {}) {
  const mapped = result.character ? mapAdstoryCharacter(result.character) : {}
  const image_url = result.image_url || mapped.image_url || existing.image_url || ''
  const costume_image_url =
    result.costume_image_url || mapped.costume_image_url || existing.costume_image_url || ''

  return {
    ...existing,
    ...mapped,
    id: mapped.id ?? existing.id,
    image_url,
    costume_image_url,
    image_status: mapped.image_status ?? (image_url ? 'completed' : existing.image_status),
    prompt: mapped.prompt ?? result.prompt ?? existing.prompt,
    references:
      mapped.references?.length > 0 ? mapped.references : (existing.references ?? []),
  }
}

export function mapCharactersToApiPayload(characters = []) {
  return characters.map((character, index) => {
    const payload = {
      name: character.name ?? '',
      role: character.role ?? '',
      gender: character.gender ?? '',
      age: character.age ?? '',
      age_range: character.age ?? character.age_range ?? '',
      description: character.description ?? '',
      personality: character.personality ?? '',
      appearance: character.appearance ?? '',
      wardrobe: character.wardrobe ?? character.clothing ?? '',
      clothing: character.wardrobe ?? character.clothing ?? '',
      importance: character.importance ?? '',
      image_url: character.image_url ?? '',
      image_status: character.image_status ?? 'pending',
      prompt: character.prompt ?? '',
      references: character.references ?? [],
      order_index: character.order_index ?? index,
    }

    if (isBackendCharacterId(character.id)) {
      payload.id = Number(character.id)
    } else if (character.id != null && String(character.id).trim() !== '') {
      payload.id = String(character.id)
    }

    return payload
  })
}

export function mapCharacterToApiPayload(character) {
  const id = character.id != null ? String(character.id) : ''
  const payload = {
    id,
    name: character.name ?? '',
    role: character.role ?? '',
    gender: character.gender ?? '',
    age: character.age ?? '',
    description: character.description ?? '',
    personality: character.personality ?? '',
    appearance: character.appearance ?? '',
    wardrobe: character.wardrobe ?? character.clothing ?? '',
    importance: character.importance ?? '',
  }

  if (isBackendCharacterId(id)) {
    payload.character_id = Number(id)
  }

  return payload
}

export async function getProjectCharacters(projectId) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/characters`, {
    fallbackMessage: 'Failed to load characters',
  })

  return mapAdstoryCharacters(data.characters ?? [])
}

export async function deleteProjectCharacter(projectId, characterId) {
  await requestAdstory(`/api/adstory/projects/${projectId}/characters/${characterId}`, {
    method: 'DELETE',
    fallbackMessage: 'Failed to delete character',
  })
  noteMaterialEdit(projectId)
}

export async function saveProjectCharactersBulk(projectId, characters = []) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/characters/bulk`, {
    method: 'PUT',
    payload: {
      characters: mapCharactersToApiPayload(characters),
    },
    fallbackMessage: 'Failed to save characters',
  })

  noteMaterialEdit(projectId)
  return mapAdstoryCharacters(data.characters ?? [])
}

export async function generateCharacterReferenceImage({
  character,
  reference_type,
  style,
  project_id,
}) {
  const payload = {
    character: mapCharacterToApiPayload(character),
    reference_type,
  }

  if (isBackendCharacterId(character?.id)) {
    payload.character_id = Number(character.id)
  }

  if (style?.trim()) {
    payload.style = style.trim().slice(0, 100)
  }
  if (project_id != null) {
    payload.project_id = project_id
  }

  const data = await postAdstory(
    '/api/adstory/generate-character-reference',
    payload,
    'Failed to generate character reference'
  )

  const reference = data.reference ?? {
    reference_type,
    image_url: data.image_url ?? '',
  }

  return {
    image_url: data.image_url ?? reference.image_url ?? '',
    reference,
    character: data.character,
  }
}

export function isBackendEnvironmentDbId(id) {
  return isBackendCharacterId(id)
}

export function getEnvironmentDbId(environment) {
  if (isBackendEnvironmentDbId(environment?.db_id)) {
    return Number(environment.db_id)
  }
  if (isBackendEnvironmentDbId(environment?.id)) {
    return Number(environment.id)
  }
  return null
}

export function mapAdstoryEnvironment(environment = {}, index = 0) {
  const meta = environment.meta && typeof environment.meta === 'object' ? environment.meta : {}
  const assets = Array.isArray(environment.assets)
    ? environment.assets.map(mapAdstoryEnvironmentAsset)
    : []
  const primaryAsset =
    assets.find((asset) => asset.is_primary && asset.image_url) ??
    assets.find((asset) => asset.image_url) ??
    null
  const imageUrl =
    environment.image_url ??
    environment.imageUrl ??
    primaryAsset?.image_url ??
    ''

  return {
    id: environment.id ?? `environment-${index + 1}`,
    db_id: environment.db_id ?? getEnvironmentDbId(environment),
    name: environment.name ?? 'Unnamed environment',
    type: environment.type ?? '',
    time_of_day: environment.time_of_day ?? '',
    description: environment.description ?? '',
    appearance: meta.appearance ?? environment.appearance ?? '',
    lighting: meta.lighting ?? environment.lighting ?? '',
    mood: environment.mood ?? meta.mood ?? '',
    importance: environment.importance ?? meta.importance ?? '',
    image_url: imageUrl,
    image_status:
      environment.image_status ??
      environment.imageStatus ??
      (imageUrl ? 'completed' : 'pending'),
    prompt: environment.prompt ?? '',
    order_index: environment.order_index ?? index,
    status: environment.status ?? 'suggested',
    meta,
    updated_at: environment.updated_at ?? environment.updatedAt ?? null,
    assets,
  }
}

export function mapAdstoryEnvironments(apiEnvironments = []) {
  return apiEnvironments.map((environment, index) => mapAdstoryEnvironment(environment, index))
}

export function mergeAdstoryEnvironmentUpdate(existing, result = {}) {
  const mapped = result.environment ? mapAdstoryEnvironment(result.environment) : {}
  const image_url = result.image_url || mapped.image_url || existing.image_url || ''

  return {
    ...existing,
    ...mapped,
    id: mapped.id ?? existing.id,
    db_id: mapped.db_id ?? existing.db_id ?? getEnvironmentDbId(existing),
    image_url,
    image_status: mapped.image_status ?? (image_url ? 'completed' : existing.image_status),
    prompt: mapped.prompt ?? existing.prompt,
  }
}

export function mapEnvironmentToApiPayload(environment) {
  const meta = {
    ...(environment.meta && typeof environment.meta === 'object' ? environment.meta : {}),
  }

  if (environment.appearance?.trim()) {
    meta.appearance = environment.appearance.trim()
  }
  if (environment.lighting?.trim()) {
    meta.lighting = environment.lighting.trim()
  }
  if (environment.importance) {
    meta.importance = environment.importance
  }

  const payload = {
    name: environment.name ?? '',
    type: environment.type ?? '',
    time_of_day: environment.time_of_day ?? '',
    description: environment.description ?? '',
    appearance: environment.appearance ?? '',
    lighting: environment.lighting ?? '',
    mood: environment.mood ?? '',
    importance: environment.importance ?? '',
    image_url: environment.image_url ?? '',
    image_status: environment.image_status ?? 'pending',
    prompt: environment.prompt ?? '',
    order_index: environment.order_index ?? 0,
    status: environment.status ?? 'draft',
    meta: Object.keys(meta).length > 0 ? meta : undefined,
  }

  if (environment.id != null && environment.id !== '') {
    payload.id = String(environment.id)
  }

  const dbId = getEnvironmentDbId(environment)
  if (dbId != null) {
    payload.db_id = dbId
  }

  return payload
}

export function mapEnvironmentsToApiPayload(environments = []) {
  return environments.map((environment, index) => ({
    ...mapEnvironmentToApiPayload({
      ...environment,
      order_index: environment.order_index ?? index,
    }),
  }))
}

export async function getProjectEnvironments(projectId) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/environments`, {
    fallbackMessage: 'Failed to load environments',
  })

  return mapAdstoryEnvironments(data.environments ?? [])
}

export async function saveProjectEnvironmentsBulk(projectId, environments = []) {
  const data = await requestAdstory(`/api/adstory/projects/${projectId}/environments/bulk`, {
    method: 'PUT',
    payload: {
      environments: mapEnvironmentsToApiPayload(environments),
    },
    fallbackMessage: 'Failed to save environments',
  })

  noteMaterialEdit(projectId)
  return mapAdstoryEnvironments(data.environments ?? [])
}

