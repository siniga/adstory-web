import { normalizeVisualStyle } from '../../config/visualStyles'
import { mapAdstoryEpisodes } from '../../creation/episodeGenerationStatus'
import {
  mapAdstoryCharacters,
  mapAdstoryEnvironments,
  mapAdstoryScenes,
  mapAdstoryShots,
  mapStoryboardSettingsFromApiShot,
} from '../adstoryApi'
import { resolveMediaUrl } from '../../utils/resolveMediaUrl'
import { normalizeShotReviewStatus } from '../../studio/shotReviewStatus'

const SCENE_GRADIENTS = [
  'linear-gradient(135deg, #0c1445 0%, #2d1b69 40%, #c45c2a 75%, #f0a050 100%)',
  'linear-gradient(135deg, #0a1628 0%, #1a3a5c 45%, #00c9a7 80%, #7bdcb5 100%)',
  'linear-gradient(135deg, #0f172a 0%, #1e3a5f 40%, #38bdf8 70%, #e0f2fe 100%)',
]

const LENS_BY_SIZE = {
  Wide: '24mm Wide',
  Medium: '50mm Standard',
  'Close Up': '85mm Portrait',
  'Extreme Wide': '24mm Wide',
  'Medium Close Up': '50mm Standard',
  'Extreme Close Up': '100mm Macro',
}

export function buildStudioShotId(sceneNumber, shotNumber, orderIndex = 0) {
  const sceneId = Number(sceneNumber)
  const raw = String(shotNumber ?? '').trim()

  if (/^\d+\.\d+$/.test(raw)) {
    const [prefix, suffix] = raw.split('.')
    if (Number(prefix) === sceneId) {
      return raw
    }
    return `${sceneId}.${suffix}`
  }

  if (/^\d+$/.test(raw)) {
    return `${sceneId}.${raw}`
  }

  return `${sceneId}.${orderIndex + 1}`
}

export function mapApiScenes(apiScenes = []) {
  return [...apiScenes]
    .sort((a, b) => a.order_index - b.order_index || a.scene_number - b.scene_number)
    .map((scene, index) => ({
      id: scene.scene_number ?? index + 1,
      apiId: scene.id,
      scene_number: scene.scene_number ?? index + 1,
      order_index: scene.order_index ?? index,
      title: scene.title ?? `Scene ${index + 1}`,
      description: scene.description ?? '',
      location: scene.location ?? '',
      time_of_day: scene.time_of_day ?? '',
      mood: scene.mood ?? '',
      visual_style: scene.visual_style ?? '',
      characters: Array.isArray(scene.characters) ? [...scene.characters] : [],
      environment: scene.environment ?? '',
      thumbGradient: SCENE_GRADIENTS[index % SCENE_GRADIENTS.length],
    }))
}

export function buildShotGroups(scenes, apiShots = []) {
  return scenes.map((scene) => {
    const shots = apiShots
      .filter((shot) => shot.scene_id === scene.apiId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((shot, index) => ({
        id: buildStudioShotId(scene.id, shot.shot_number, shot.order_index ?? index),
        apiId: shot.id,
        shotSize: shot.shot_size ?? 'Medium',
        camera: shot.camera ?? 'Static',
        description: shot.description ?? shot.title,
        composition: shot.composition,
        lighting: shot.lighting,
        durationSeconds: shot.duration_seconds ?? 3,
        imageStatus: shot.image_status ?? (shot.image_url ? 'completed' : 'pending'),
        prompt: shot.prompt ?? null,
      }))

    return {
      sceneId: scene.id,
      sceneTitle: scene.title,
      shots,
    }
  })
}

export function mapApiToStudioScenes(apiProject, scenes, shotReviewStatuses = {}) {
  const story = apiProject.story ?? ''
  const apiShots = apiProject.shots ?? []

  return scenes.map((scene) => {
    const sceneShots = apiShots
      .filter((shot) => shot.scene_id === scene.apiId)
      .sort((a, b) => a.order_index - b.order_index)
      .map((shot, index) => {
        const studioShot = {
        id: buildStudioShotId(scene.id, shot.shot_number, shot.order_index ?? index),
        apiId: shot.id,
        label: shot.title,
        shotType: `${shot.shot_size ?? 'Medium'} Shot`,
        previewImage: resolveMediaUrl(shot.image_url),
        imageUrl: shot.image_url ?? null,
        imageUpdatedAt: shot.updated_at ?? shot.image_updated_at ?? null,
        imageVersion: shot.image_version ?? null,
        imageStatus: shot.image_status ?? (shot.image_url ? 'completed' : 'pending'),
        thumbGradient: scene.thumbGradient,
        sceneContext: `${scene.title} — ${scene.location}`,
        lighting: shot.lighting ?? inferLighting(scene.mood),
        notes: shot.description ?? shot.title,
        duration: `${shot.duration_seconds ?? 3}s`,
        frameCount: Math.max((shot.duration_seconds ?? 3) * 30, 30),
        description: shot.description ?? shot.title,
        prompt: shot.prompt ?? null,
        meta: shot.meta && typeof shot.meta === 'object' ? shot.meta : null,
        selectedCandidateId:
          shot.meta?.selected_candidate_id ??
          shot.selected_candidate_id ??
          null,
        reviewStatus: normalizeShotReviewStatus(
          shot.review_status ??
            shotReviewStatuses[String(shot.id)] ??
            shotReviewStatuses[buildStudioShotId(scene.id, shot.shot_number, shot.order_index ?? index)]
        ),
        presets: {
          composition: shot.composition ?? 'Rule of Thirds',
          shotSize: shot.shot_size ?? 'Medium',
          camera: shot.camera ?? 'Static',
          lens: LENS_BY_SIZE[shot.shot_size] ?? '50mm Standard',
          lighting: shot.lighting ?? inferLightingPreset(scene.mood),
          timeOfDay: inferTimeOfDay(scene),
          mood: scene.mood?.split(',')[0]?.trim() ?? 'Neutral',
        },
        suggestions: {
          composition: 'Adjust framing in Studio after reviewing generated image.',
          lighting: 'Match lighting to scene mood during refinement.',
          environment: scene.description,
          character: story.slice(0, 80),
        },
        }

        if (shot.characters !== undefined) {
          studioShot.characters = mapApiCharacters(shot.characters ?? [])
        }

        if (shot.environment !== undefined) {
          studioShot.environment = shot.environment ? mapApiEnvironment(shot.environment) : null
        }

        if (shot.objects !== undefined) {
          studioShot.objects = mapApiObjects(shot.objects ?? [])
        }

        Object.assign(studioShot, mapStoryboardSettingsFromApiShot(shot))

        return studioShot
      })

    return {
      id: scene.id,
      apiId: scene.apiId,
      title: scene.title,
      shots: sceneShots,
    }
  })
}

export function mapApiEnvironment(environment = {}) {
  const meta = environment.meta && typeof environment.meta === 'object' ? environment.meta : {}

  return {
    id: environment.id,
    name: environment.name ?? 'Unnamed environment',
    type: environment.type ?? 'Location',
    description: environment.description ?? '',
    location: environment.location ?? meta.location ?? '',
    timeOfDay: environment.time_of_day ?? meta.time_of_day ?? null,
    weather: environment.weather ?? meta.weather ?? null,
    mood: environment.mood ?? meta.mood ?? null,
    lightingStyle: environment.lighting ?? meta.lighting ?? null,
    importance: normalizeEnvironmentImportance(environment.importance ?? meta.importance),
    status: environment.status ?? 'suggested',
    notes: environment.notes ?? meta.notes ?? null,
    imageUrl: environment.image_url ?? environment.imageUrl ?? null,
    imageStatus:
      environment.image_status ??
      environment.imageStatus ??
      (environment.image_url || environment.imageUrl ? 'completed' : 'pending'),
    updatedAt: environment.updated_at ?? environment.updatedAt ?? null,
    previewImage: resolveMediaUrl(
      environment.image_url ?? environment.imageUrl ?? environment.reference_image_url
    ),
    thumbnailGradient: SCENE_GRADIENTS[0],
  }
}

export function mapApiEnvironments(apiEnvironments = []) {
  return apiEnvironments.map(mapApiEnvironment)
}

export function mapApiObject(object = {}) {
  const meta = object.meta && typeof object.meta === 'object' ? object.meta : {}

  return {
    id: object.id,
    name: object.name ?? 'Unnamed object',
    category: object.category ?? 'prop',
    categoryLabel: object.category ?? 'Prop',
    description: object.description ?? '',
    material: object.material ?? meta.material ?? null,
    color: object.color ?? meta.color ?? null,
    primaryColor: object.color ?? meta.color ?? null,
    condition: object.condition ?? meta.condition ?? null,
    importance: normalizeObjectImportance(object.importance ?? meta.importance),
    usedBy: object.used_by ?? meta.used_by ?? meta.used_in_context ?? null,
    usedInContext: object.used_by ?? meta.used_by ?? object.used_in_context ?? meta.used_in_context ?? null,
    notes: object.notes ?? meta.notes ?? null,
    status: object.status ?? 'suggested',
    source: object.source ?? null,
    userPrompt: object.user_prompt ?? null,
    meta: object.meta ?? null,
    previewImage: resolveMediaUrl(object.reference_image_url),
    thumbnailGradient: 'linear-gradient(145deg, #1e293b 0%, #334155 50%, #475569 100%)',
  }
}

export function mapApiObjects(apiObjects = []) {
  return apiObjects.map(mapApiObject)
}

function indexShotAssetsByShotId(apiProject) {
  const byShotId = new Map()

  const appendAssets = (assets) => {
    for (const asset of assets) {
      const shotId = asset?.shot_id
      if (shotId == null) continue

      const key = Number(shotId)
      if (!byShotId.has(key)) {
        byShotId.set(key, [])
      }
      byShotId.get(key).push(asset)
    }
  }

  appendAssets(apiProject.shot_assets ?? [])

  for (const apiShot of apiProject.shots ?? []) {
    appendAssets(apiShot.shot_assets ?? [])
  }

  return byShotId
}

export function buildShotAssignmentsFromApi(apiProject, studioScenes) {
  const assignments = {}
  const studioIdByApiShotId = new Map()
  const assetsByShotId = indexShotAssetsByShotId(apiProject)

  for (const scene of studioScenes) {
    for (const shot of scene.shots ?? []) {
      if (shot.apiId != null) {
        studioIdByApiShotId.set(Number(shot.apiId), shot.id)
        studioIdByApiShotId.set(String(shot.apiId), shot.id)
      }
    }
  }

  for (const apiShot of apiProject.shots ?? []) {
    const studioShotId = studioIdByApiShotId.get(apiShot.id) ?? studioIdByApiShotId.get(String(apiShot.id))
    if (!studioShotId) continue

    const shotAssets =
      (apiShot.shot_assets?.length ? apiShot.shot_assets : null) ??
      assetsByShotId.get(Number(apiShot.id)) ??
      []
    const characterIdsFromAssets = shotAssets
      .filter((asset) => asset.asset_type === 'character')
      .map((asset) => Number(asset.asset_id))
    const characterIdsFromPivot = (apiShot.characters ?? []).map((character) => Number(character.id))
    const characterIds = [...new Set([...characterIdsFromPivot, ...characterIdsFromAssets])]

    const environmentAsset = shotAssets.find((asset) => asset.asset_type === 'environment')
    const objectIds = shotAssets
      .filter((asset) => asset.asset_type === 'object')
      .map((asset) => Number(asset.asset_id))

    assignments[studioShotId] = {
      characterIds,
      environmentId: environmentAsset ? Number(environmentAsset.asset_id) : null,
      objectIds,
    }
  }

  return assignments
}

export function buildStudioPayloadFromApi(apiProject, scenes, shotReviewStatuses = {}) {
  const studioScenes = mapApiToStudioScenes(apiProject, scenes, shotReviewStatuses)
  const shotAssignments = buildShotAssignmentsFromApi(apiProject, studioScenes)
  const characters = mapApiCharacters(apiProject.characters ?? [])
  const environments = mapApiEnvironments(apiProject.environments ?? [])
  const objects = mapApiObjects(apiProject.objects ?? [])

  return {
    studioScenes,
    shotAssignments,
    extractedAssets: {
      characters,
      environment: environments[0] ?? null,
      objects,
    },
  }
}

export function buildFrameGroups(shotGroups, scenes) {
  return shotGroups.map((group) => {
    const scene = scenes.find((item) => item.id === group.sceneId)
    const gradient =
      scene?.thumbGradient ?? SCENE_GRADIENTS[(group.sceneId - 1) % SCENE_GRADIENTS.length]

    return {
      shotId: group.shots[0]?.id ?? `${group.sceneId}.1`,
      shotLabel: group.shots[0]?.description ?? group.sceneTitle,
      frames: group.shots.map((shot) => ({
        id: `F-${shot.id}-1`,
        description: shot.description,
        duration: `${shot.durationSeconds ?? 3}s`,
        thumbGradient: gradient,
      })),
    }
  })
}

export function mapApiCharacter(character = {}) {
  const appearance = character.appearance
  const isAppearanceObject =
    appearance && typeof appearance === 'object' && !Array.isArray(appearance)
  const meta = character.meta && typeof character.meta === 'object' ? character.meta : {}

  return {
    id: character.id,
    name: character.name ?? 'Unnamed character',
    role: character.role ?? '',
    description: character.description ?? '',
    appearance: isAppearanceObject
      ? (appearance.physical ?? '')
      : typeof appearance === 'string'
        ? appearance
        : '',
    clothing: isAppearanceObject ? (appearance.clothing ?? '') : (character.clothing ?? ''),
    importance: normalizeCharacterImportance(
      isAppearanceObject ? appearance.importance : character.importance
    ),
    notes: character.notes ?? meta.notes ?? '',
    status: character.status ?? 'suggested',
    referenceStatus: character.reference_status ?? 'not_started',
    ageRange: character.age_range ?? (isAppearanceObject ? appearance.age_range : null),
    gender: character.gender ?? (isAppearanceObject ? appearance.gender : null),
    ethnicity: character.ethnicity ?? (isAppearanceObject ? appearance.ethnicity : null) ?? null,
    personality: character.personality ?? (isAppearanceObject ? appearance.personality : null),
    skinTone: isAppearanceObject ? (appearance.skin_tone ?? null) : null,
    hair: isAppearanceObject ? (appearance.hair ?? '') : '',
    beard: isAppearanceObject ? (appearance.beard ?? '') : '',
    build: isAppearanceObject ? (appearance.build ?? '') : '',
    height: isAppearanceObject ? (appearance.height ?? '') : '',
    meta: meta,
    heroImageUrl: character.hero_image_url ?? character.heroImageUrl ?? null,
    heroImageStatus: character.hero_image_status ?? character.heroImageStatus ?? 'pending',
    referenceImageUrl:
      character.reference_image_url ??
      character.referenceImageUrl ??
      character.hero_image_url ??
      character.heroImageUrl ??
      null,
    imageStatus:
      character.image_status ??
      character.imageStatus ??
      character.hero_image_status ??
      character.heroImageStatus ??
      'pending',
    identityGenerationStatus:
      character.identity_generation_status ?? character.identityGenerationStatus ?? 'pending',
    references: character.references ?? character.reference_images ?? [],
    updatedAt: character.updated_at ?? character.updatedAt ?? null,
  }
}

export function mapApiCharacters(apiCharacters = []) {
  return apiCharacters.map(mapApiCharacter)
}

function normalizeCharacterImportance(value) {
  const importance = String(value ?? 'supporting').toLowerCase()
  if (importance === 'main' || importance === 'supporting' || importance === 'background') {
    return importance
  }
  return 'supporting'
}

function normalizeEnvironmentImportance(value) {
  const importance = String(value ?? 'supporting').toLowerCase()
  if (importance === 'main' || importance === 'supporting' || importance === 'background') {
    return importance
  }
  return 'supporting'
}

function normalizeObjectImportance(value) {
  const importance = String(value ?? 'supporting').toLowerCase()
  if (importance === 'main' || importance === 'supporting' || importance === 'background') {
    return importance
  }
  return 'supporting'
}

export function deriveStatusFromApi(apiProject, previousStatus = {}) {
  const apiScenes = mapAdstoryScenes(apiProject.scenes ?? [])
  const sceneboardDone =
    previousStatus.sceneboard === 'done' ||
    apiScenes.length > 0
  const hasShots = (apiProject.shots?.length ?? 0) > 0
  const hasCharacters = (apiProject.characters?.length ?? 0) > 0
  const hasEnvironments = (apiProject.environments?.length ?? 0) > 0
  const hasObjects = (apiProject.objects?.length ?? 0) > 0
  const hasShotAssets =
    (apiProject.shot_assets?.length ?? 0) > 0 ||
    (apiProject.shots ?? []).some(
      (shot) =>
        (shot.shot_assets?.length ?? 0) > 0 ||
        (shot.characters?.length ?? 0) > 0 ||
        shot.environment != null ||
        (shot.objects?.length ?? 0) > 0
    )

  const shots = sceneboardDone || hasShots ? 'done' : previousStatus.shots ?? 'idle'
  const characters =
    previousStatus.characters === 'done' || (sceneboardDone && hasCharacters)
      ? 'done'
      : previousStatus.characters ?? 'idle'
  const environments =
    previousStatus.environments === 'done' || (characters === 'done' && hasEnvironments)
      ? 'done'
      : previousStatus.environments ?? 'idle'
  const objects =
    previousStatus.objects === 'done' ||
    (environments === 'done' && (hasObjects || hasShotAssets || hasShots))
      ? 'done'
      : previousStatus.objects ?? 'idle'

  return {
    story: apiProject.story?.trim() ? 'ready' : previousStatus.story ?? 'idle',
    script: apiProject.script?.trim() ? 'done' : previousStatus.script ?? 'idle',
    screenplay: apiProject.screenplay?.trim() ? 'done' : previousStatus.screenplay ?? 'idle',
    sceneboard: sceneboardDone
      ? 'done'
      : apiScenes.length
        ? previousStatus.sceneboard ?? 'idle'
        : previousStatus.sceneboard ?? 'idle',
    scenes: sceneboardDone ? 'done' : apiScenes.length ? previousStatus.scenes ?? 'idle' : previousStatus.scenes ?? 'idle',
    shots,
    characters,
    environments,
    objects,
    frames: hasShots ? 'done' : previousStatus.frames ?? 'idle',
    images: previousStatus.images ?? 'idle',
  }
}

export function sceneHasGeneratedImages(studioScene) {
  const shots = studioScene?.shots ?? []
  return shots.length > 0 && shots.every((shot) => Boolean(shot.previewImage))
}

export function getFirstSceneApiId(apiScenes = []) {
  if (!apiScenes.length) {
    return null
  }

  const sorted = [...apiScenes].sort(
    (a, b) => a.order_index - b.order_index || a.scene_number - b.scene_number
  )

  return sorted[0]?.id ?? null
}

export function applyRegeneratedShotToProject(project, shotApiId, shotPayload) {
  if (!project?.studioScenes?.length || !shotApiId || !shotPayload) {
    return project
  }

  const imageUrl = shotPayload.image_url ?? null
  const imageUpdatedAt =
    shotPayload.updated_at ?? shotPayload.image_updated_at ?? Date.now()
  const imageVersion = shotPayload.image_version ?? imageUpdatedAt

  const studioScenes = project.studioScenes.map((scene) => ({
    ...scene,
    shots: scene.shots.map((shot) => {
      if (String(shot.apiId) !== String(shotApiId)) {
        return shot
      }

      return {
        ...shot,
        imageUrl: imageUrl ?? shot.imageUrl,
        previewImage: imageUrl != null ? resolveMediaUrl(imageUrl) : shot.previewImage,
        imageUpdatedAt,
        imageVersion,
        imageStatus: shotPayload.image_status ?? (imageUrl ? 'completed' : shot.imageStatus),
        meta:
          shotPayload.meta && typeof shotPayload.meta === 'object'
            ? shotPayload.meta
            : shot.meta,
      }
    }),
  }))

  return { ...project, studioScenes }
}

export function mapApiResponseToProjectState(current, apiProject, options = {}) {
  const apiScenes = apiProject.scenes ?? []
  const scenes =
    apiScenes.length > 0 ? mapAdstoryScenes(apiScenes) : (current.scenes ?? [])
  const apiShots = apiProject.shots ?? []
  const shotGroups =
    apiShots.length > 0 ? mapAdstoryShots(apiShots, scenes) : (current.shotGroups ?? [])
  const status = {
    ...deriveStatusFromApi(apiProject, current.status),
    ...(options.statusOverrides ?? {}),
  }

  const next = {
    ...current,
    projectId: apiProject.id,
    name: apiProject.title ?? current.name,
    visualStyle: normalizeVisualStyle(
      apiProject.meta?.visual_style ?? apiProject.visual_style ?? current.visualStyle
    ),
    defaultEthnicity: apiProject.meta?.default_ethnicity ?? current.defaultEthnicity ?? null,
    story: apiProject.story ?? current.story ?? '',
    script: apiProject.script?.trim() ? apiProject.script : (current.script ?? ''),
    screenplay: apiProject.screenplay?.trim()
      ? apiProject.screenplay
      : (current.screenplay ?? ''),
    episodes:
      (apiProject.episodes?.length ?? apiProject.episodes_summary?.length ?? 0) > 0
        ? mapAdstoryEpisodes(apiProject.episodes ?? apiProject.episodes_summary ?? [])
        : (current.episodes ?? []),
    episodesSummary:
      (apiProject.episodes_summary?.length ?? apiProject.episodes?.length ?? 0) > 0
        ? mapAdstoryEpisodes(apiProject.episodes_summary ?? apiProject.episodes ?? [])
        : (current.episodesSummary ?? current.episodes ?? []),
    scenes,
    shotGroups,
    characters:
      (apiProject.characters?.length ?? 0) > 0
        ? mapAdstoryCharacters(apiProject.characters)
        : (current.characters ?? []),
    environments:
      (apiProject.environments?.length ?? 0) > 0
        ? mapAdstoryEnvironments(apiProject.environments)
        : (current.environments ?? []),
    objects: mapApiObjects(apiProject.objects ?? current.objects ?? []),
    sceneGenerationStatus: apiProject.scene_generation_status ?? current.sceneGenerationStatus ?? null,
    sceneGenerationTotal:
      apiProject.scene_generation_total ?? current.sceneGenerationTotal ?? 0,
    sceneGenerationCompleted:
      apiProject.scene_generation_completed ?? current.sceneGenerationCompleted ?? 0,
    sceneGenerationFailed:
      apiProject.scene_generation_failed ?? current.sceneGenerationFailed ?? 0,
    sceneGenerationStartedAt:
      apiProject.scene_generation_started_at ?? current.sceneGenerationStartedAt ?? null,
    sceneGenerationFinishedAt:
      apiProject.scene_generation_finished_at ?? current.sceneGenerationFinishedAt ?? null,
    shotGenerationStatus:
      apiProject.shot_generation_status ?? current.shotGenerationStatus ?? null,
    shotGenerationTotal:
      apiProject.shot_generation_total ?? current.shotGenerationTotal ?? 0,
    shotGenerationCompleted:
      apiProject.shot_generation_completed ?? current.shotGenerationCompleted ?? 0,
    shotGenerationFailed:
      apiProject.shot_generation_failed ?? current.shotGenerationFailed ?? 0,
    shotGenerationStartedAt:
      apiProject.shot_generation_started_at ?? current.shotGenerationStartedAt ?? null,
    shotGenerationFinishedAt:
      apiProject.shot_generation_finished_at ?? current.shotGenerationFinishedAt ?? null,
    characterGenerationStatus:
      apiProject.character_generation_status ?? current.characterGenerationStatus ?? null,
    characterGenerationTotal:
      apiProject.character_generation_total ?? current.characterGenerationTotal ?? 0,
    characterGenerationCompleted:
      apiProject.character_generation_completed ?? current.characterGenerationCompleted ?? 0,
    characterGenerationFailed:
      apiProject.character_generation_failed ?? current.characterGenerationFailed ?? 0,
    characterGenerationStartedAt:
      apiProject.character_generation_started_at ?? current.characterGenerationStartedAt ?? null,
    characterGenerationFinishedAt:
      apiProject.character_generation_finished_at ?? current.characterGenerationFinishedAt ?? null,
    environmentGenerationStatus:
      apiProject.environment_generation_status ?? current.environmentGenerationStatus ?? null,
    environmentGenerationTotal:
      apiProject.environment_generation_total ?? current.environmentGenerationTotal ?? 0,
    environmentGenerationCompleted:
      apiProject.environment_generation_completed ?? current.environmentGenerationCompleted ?? 0,
    environmentGenerationFailed:
      apiProject.environment_generation_failed ?? current.environmentGenerationFailed ?? 0,
    environmentGenerationStartedAt:
      apiProject.environment_generation_started_at ?? current.environmentGenerationStartedAt ?? null,
    environmentGenerationFinishedAt:
      apiProject.environment_generation_finished_at ?? current.environmentGenerationFinishedAt ?? null,
    aiTasksSummary: apiProject.ai_tasks_summary ?? current.aiTasksSummary ?? null,
    status,
    updatedAt: Date.now(),
  }

  if (apiProject.shots?.length) {
    Object.assign(next, buildStudioPayloadFromApi(apiProject, scenes, current.shotReviewStatuses ?? {}))
    next.frameGroups = buildFrameGroups(next.shotGroups, scenes)
    next.status = { ...next.status, frames: 'done' }
  }

  next.shotReviewStatuses = {
    ...(next.shotReviewStatuses ?? {}),
    ...(current.shotReviewStatuses ?? {}),
  }

  if (options.frameGroups) {
    next.frameGroups = options.frameGroups
  }

  return next
}

function inferLighting(mood = '') {
  const value = mood.toLowerCase()
  if (value.includes('tense') || value.includes('conflict')) return 'Low key, motivated contrast'
  if (value.includes('hopeful') || value.includes('resolution')) return 'Dawn backlight, soft haze'
  return 'Golden hour, warm backlight'
}

function inferLightingPreset(mood = '') {
  const value = mood.toLowerCase()
  if (value.includes('tense') || value.includes('conflict')) return 'Low Key'
  if (value.includes('hopeful') || value.includes('resolution')) return 'Natural'
  return 'Golden Hour'
}

function inferTimeOfDay(scene) {
  const text = `${scene.title} ${scene.location}`.toLowerCase()
  if (text.includes('night')) return 'Night'
  if (text.includes('dawn')) return 'Sunrise'
  if (text.includes('sunset')) return 'Sunset'
  return 'Sunset'
}
