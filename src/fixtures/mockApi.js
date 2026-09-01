import { IMAGES } from './images'
import {
  SAMPLE_SCREENPLAY,
  SAMPLE_SCRIPT,
  createEmptyApiProject,
  sampleCharacters,
  sampleEnvironments,
  sampleScenes,
  sampleShotsForScene,
} from './seed'
import {
  deleteProject,
  getProjectRef,
  listProjects,
  nextId,
  saveProject,
  touch,
} from './store'

function ok(data = {}) {
  return { success: true, ...data }
}

function notFound(message = 'Not found') {
  const error = new Error(message)
  error.status = 404
  error.payload = { success: false, message }
  throw error
}

function matchRoute(method, path, wantedMethod, pattern) {
  if (method !== wantedMethod) return null
  const keys = []
  const regex = new RegExp(
    `^${pattern.replace(/:([A-Za-z]+)/g, (_, key) => {
      keys.push(key)
      return '([^/]+)'
    })}$`
  )
  const match = path.match(regex)
  if (!match) return null
  const params = {}
  keys.forEach((key, index) => {
    params[key] = decodeURIComponent(match[index + 1])
  })
  return params
}

function requireProject(id) {
  const project = getProjectRef(id)
  if (!project) notFound('Project not found')
  return project
}

function requireScene(project, sceneId) {
  const scene = project.scenes.find((item) => String(item.id) === String(sceneId))
  if (!scene) notFound('Scene not found')
  return scene
}

function requireShot(project, shotId) {
  const shot = project.shots.find((item) => String(item.id) === String(shotId))
  if (!shot) notFound('Shot not found')
  return shot
}

function requireCharacter(project, characterId) {
  const character = project.characters.find((item) => String(item.id) === String(characterId))
  if (!character) notFound('Character not found')
  return character
}

function requireEnvironment(project, environmentId) {
  const environment = project.environments.find((item) => String(item.id) === String(environmentId))
  if (!environment) notFound('Environment not found')
  return environment
}

function toListProject(project) {
  const story = project.story ?? project.story_text ?? ''
  return {
    id: project.id,
    title: project.title,
    visual_style: project.visual_style,
    style: project.style ?? project.visual_style,
    cover_image_url: project.cover_image_url,
    current_step: project.current_step,
    status: project.status,
    story,
    story_text: story,
    story_preview: story.trim().slice(0, 160),
    scenes_count: project.scenes?.length ?? 0,
    shots_count: project.shots?.length ?? 0,
    generated_images_count: (project.shots ?? []).filter((shot) => shot.image_url).length,
    created_at: project.created_at,
    updated_at: project.updated_at,
  }
}

function toApiProject(project) {
  return {
    id: project.id,
    title: project.title,
    story: project.story,
    story_text: project.story,
    script: project.script,
    screenplay: project.screenplay,
    visual_style: project.visual_style,
    style: project.style ?? project.visual_style,
    cover_image_url: project.cover_image_url,
    current_step: project.current_step,
    status: project.status,
    scene_generation_status: project.scene_generation_status,
    scene_generation_total: project.scene_generation_total ?? 0,
    scene_generation_completed: project.scene_generation_completed ?? 0,
    scene_generation_failed: project.scene_generation_failed ?? 0,
    scene_generation_started_at: project.scene_generation_started_at,
    scene_generation_finished_at: project.scene_generation_finished_at,
    shot_generation_status: project.shot_generation_status,
    shot_generation_total: project.shot_generation_total ?? 0,
    shot_generation_completed: project.shot_generation_completed ?? 0,
    shot_generation_failed: project.shot_generation_failed ?? 0,
    shot_generation_started_at: project.shot_generation_started_at,
    shot_generation_finished_at: project.shot_generation_finished_at,
    character_generation_status: project.character_generation_status,
    character_generation_total: project.character_generation_total ?? 0,
    character_generation_completed: project.character_generation_completed ?? 0,
    character_generation_failed: project.character_generation_failed ?? 0,
    character_generation_started_at: project.character_generation_started_at,
    character_generation_finished_at: project.character_generation_finished_at,
    environment_generation_status: project.environment_generation_status,
    environment_generation_total: project.environment_generation_total ?? 0,
    environment_generation_completed: project.environment_generation_completed ?? 0,
    environment_generation_failed: project.environment_generation_failed ?? 0,
    environment_generation_started_at: project.environment_generation_started_at,
    environment_generation_finished_at: project.environment_generation_finished_at,
    meta: project.meta ?? {},
    created_at: project.created_at,
    updated_at: project.updated_at,
  }
}

function toFullProject(project) {
  return {
    ...toApiProject(project),
    scenes: project.scenes ?? [],
    shots: project.shots ?? [],
    characters: project.characters ?? [],
    environments: project.environments ?? [],
    objects: project.objects ?? [],
    episodes: project.episodes ?? [],
    episodes_summary: project.episodes_summary ?? project.episodes ?? [],
    counts: {
      scenes: project.scenes?.length ?? 0,
      shots: project.shots?.length ?? 0,
      characters: project.characters?.length ?? 0,
      environments: project.environments?.length ?? 0,
    },
  }
}

function sceneWithCounts(project, scene) {
  const shotCount = (project.shots ?? []).filter(
    (shot) => String(shot.adstory_scene_id ?? shot.scene_id) === String(scene.id)
  ).length
  return {
    ...scene,
    shot_count: shotCount,
    shots_count: shotCount,
  }
}

function shotsForScene(project, scene) {
  return (project.shots ?? []).filter(
    (shot) => String(shot.adstory_scene_id ?? shot.scene_id) === String(scene.id)
  )
}

function sceneProgress(project) {
  const scenes = project.scenes ?? []
  const total = scenes.length
  const completed = scenes.filter((scene) => scene.status === 'completed').length
  return {
    status: project.scene_generation_status ?? (total ? 'completed' : 'idle'),
    total,
    completed,
    failed: 0,
    remaining: Math.max(0, total - completed),
    progress_percent: total ? Math.round((completed / total) * 100) : 0,
    stalled: false,
    current_scene: null,
    scenes,
    project: toApiProject(project),
  }
}

function shotProgress(project, scene = null) {
  const shots = scene ? shotsForScene(project, scene) : project.shots ?? []
  const total = shots.length
  const completed = shots.filter((shot) => shot.image_status === 'completed' || shot.status === 'completed').length
  return {
    status: scene?.shot_generation_status ?? project.shot_generation_status ?? (total ? 'completed' : 'idle'),
    shot_generation_status: scene?.shot_generation_status ?? (total ? 'completed' : 'idle'),
    total,
    completed,
    failed: 0,
    remaining: Math.max(0, total - completed),
    progress_percent: total ? 100 : 0,
    current_shot: null,
    scene: scene ? sceneWithCounts(project, scene) : null,
    shots,
    started: false,
    project: toApiProject(project),
  }
}

function characterProgress(project) {
  const characters = project.characters ?? []
  const total = characters.length
  return {
    status: project.character_generation_status ?? (total ? 'completed' : 'idle'),
    phase: total ? 'done' : 'idle',
    total,
    completed: total,
    failed: 0,
    remaining: 0,
    running: 0,
    queued: 0,
    progress_percent: total ? 100 : 0,
    stalled: false,
    current_character: null,
    characters,
    project: toApiProject(project),
    started: false,
  }
}

function environmentProgress(project) {
  const environments = project.environments ?? []
  const total = environments.length
  return {
    status: project.environment_generation_status ?? (total ? 'completed' : 'idle'),
    phase: total ? 'done' : 'idle',
    total,
    completed: total,
    failed: 0,
    remaining: 0,
    running: 0,
    queued: 0,
    progress_percent: total ? 100 : 0,
    stalled: false,
    current_environment: null,
    environments,
    project: toApiProject(project),
    started: false,
  }
}

function imageProgress(project, scene) {
  const shots = shotsForScene(project, scene)
  return {
    status: 'completed',
    image_generation_status: 'completed',
    total: shots.length,
    total_shots: shots.length,
    completed: shots.length,
    failed: 0,
    remaining: 0,
    progress_percent: shots.length ? 100 : 0,
    scene: sceneWithCounts(project, scene),
    shots,
    updated_shots: shots,
  }
}

function ensureScenes(project) {
  if ((project.scenes?.length ?? 0) > 0) return project.scenes
  const startId = nextId('scene')
  nextId('scene')
  project.scenes = sampleScenes(project.id, startId)
  project.scene_generation_status = 'completed'
  project.scene_generation_total = project.scenes.length
  project.scene_generation_completed = project.scenes.length
  touch(project)
  return project.scenes
}

function regenerateShotsForScene(project, scene) {
  const sceneId = String(scene.id)
  project.shots = (project.shots ?? []).filter(
    (shot) => String(shot.adstory_scene_id ?? shot.scene_id) !== sceneId
  )
  const startId = nextId('shot')
  nextId('shot')
  const created = sampleShotsForScene(project, scene, startId).map((shot, index) => {
    const imageUrl = index % 2 === 0 ? IMAGES.dawn : IMAGES.interior
    const image = {
      ...(shot.images?.[0] ?? {}),
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      updated_at: new Date().toISOString(),
    }
    return {
      ...shot,
      image_url: imageUrl,
      images: [image],
      approved_image: image,
      updated_at: new Date().toISOString(),
    }
  })
  project.shots = [...project.shots, ...created]
  scene.shot_generation_status = 'completed'
  project.shot_generation_status = 'completed'
  project.shot_generation_total = project.shots.length
  project.shot_generation_completed = project.shots.length
  touch(project)
  return created
}

function refreshShotImagesForScene(project, scene) {
  const existing = shotsForScene(project, scene)
  if (!existing.length) return regenerateShotsForScene(project, scene)

  const now = new Date().toISOString()
  existing.forEach((shot, index) => {
    const imageUrl = index % 2 === 0 ? IMAGES.dawn : IMAGES.interior
    const image = {
      ...(shot.images?.[0] ?? {}),
      id: nextId('image'),
      image_url: imageUrl,
      thumbnail_url: imageUrl,
      updated_at: now,
    }
    shot.image_url = imageUrl
    shot.images = [image]
    shot.approved_image = image
    shot.updated_at = now
  })
  touch(project)
  return existing
}

function ensureShotsForScene(project, scene, { force = false } = {}) {
  if (force) return regenerateShotsForScene(project, scene)
  const existing = shotsForScene(project, scene)
  if (existing.length) return existing
  return regenerateShotsForScene(project, scene)
}

function ensureCharacters(project) {
  if ((project.characters?.length ?? 0) > 0) return project.characters
  const startId = nextId('character')
  nextId('character')
  project.characters = sampleCharacters(project.id, startId)
  project.character_generation_status = 'completed'
  project.character_generation_total = project.characters.length
  project.character_generation_completed = project.characters.length
  touch(project)
  return project.characters
}

function ensureEnvironments(project) {
  if ((project.environments?.length ?? 0) > 0) return project.environments
  const startId = nextId('environment')
  project.environments = sampleEnvironments(project.id, startId)
  project.environment_generation_status = 'completed'
  project.environment_generation_total = project.environments.length
  project.environment_generation_completed = project.environments.length
  touch(project)
  return project.environments
}

function applyProjectFields(project, body = {}) {
  if (body.title != null) project.title = String(body.title)
  if (body.story != null || body.story_text != null) {
    project.story = body.story ?? body.story_text
    project.story_text = project.story
  }
  if (body.script != null) project.script = body.script
  if (body.screenplay != null) project.screenplay = body.screenplay
  if (body.style != null || body.visual_style != null) {
    project.visual_style = body.style ?? body.visual_style
    project.style = project.visual_style
    project.meta = { ...(project.meta ?? {}), visual_style: project.visual_style }
  }
  if (body.current_step != null) project.current_step = body.current_step
  if (body.status != null) project.status = body.status
  if (body.meta && typeof body.meta === 'object') {
    project.meta = { ...(project.meta ?? {}), ...body.meta }
  }
  return saveProject(project)
}

const DEMO_USER = {
  id: 1,
  name: 'Demo Creator',
  email: 'demo@screenly.test',
}

function handleAuth(method, path, body) {
  if (matchRoute(method, path, 'POST', '/api/auth/login')) {
    return {
      token: 'fixture-token',
      user: {
        ...DEMO_USER,
        email: body?.email || DEMO_USER.email,
        name: String(body?.email || DEMO_USER.email).split('@')[0] || DEMO_USER.name,
      },
    }
  }
  if (matchRoute(method, path, 'POST', '/api/auth/register')) {
    return {
      token: 'fixture-token',
      user: {
        id: 2,
        name: body?.name || 'New Creator',
        email: body?.email || 'new@screenly.test',
      },
    }
  }
  if (matchRoute(method, path, 'GET', '/api/auth/user')) {
    return { user: DEMO_USER }
  }
  if (matchRoute(method, path, 'POST', '/api/auth/logout')) {
    return { message: 'Logged out successfully.' }
  }
  return null
}

export async function handleFixtureRequest(method, endpoint, body) {
  const path = String(endpoint || '').split('?')[0].replace(/\/$/, '') || '/'

  const auth = handleAuth(method, path, body)
  if (auth) return auth

  let params

  if (matchRoute(method, path, 'GET', '/api/adstory/projects')) {
    return ok({ projects: listProjects().map(toListProject) })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/projects')) {
    const id = nextId('project')
    const project = createEmptyApiProject(id, body ?? {})
    saveProject(project)
    return ok({ project: toApiProject(project) })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/full')
  if (params) {
    return ok({ project: toFullProject(requireProject(params.id)) })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id')
  if (params) {
    return ok({ project: toApiProject(requireProject(params.id)) })
  }

  params = matchRoute(method, path, 'DELETE', '/api/adstory/projects/:id')
  if (params) {
    if (!deleteProject(params.id)) notFound('Project not found')
    return ok({ message: 'Deleted' })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/story')
  if (params) {
    return ok({ project: toApiProject(applyProjectFields(requireProject(params.id), body)) })
  }
  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/script')
  if (params) {
    return ok({ project: toApiProject(applyProjectFields(requireProject(params.id), body)) })
  }
  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/screenplay')
  if (params) {
    return ok({ project: toApiProject(applyProjectFields(requireProject(params.id), body)) })
  }
  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/core')
  if (params) {
    return ok({ project: toApiProject(applyProjectFields(requireProject(params.id), body)) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/generate-cover')
  if (params) {
    const project = requireProject(params.id)
    project.cover_image_url = project.cover_image_url || IMAGES.draftCover
    saveProject(project)
    return ok({ project: toApiProject(project), cover_image_url: project.cover_image_url })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/sceneboard')
  if (params) {
    const project = requireProject(params.id)
    const scenes = (project.scenes ?? []).map((scene) => sceneWithCounts(project, scene))
    return ok({
      scenes,
      summary: {
        scene_count: scenes.length,
        shot_count: project.shots?.length ?? 0,
      },
    })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/storyboard')
  if (params) {
    const project = requireProject(params.id)
    return ok({
      project: toApiProject(project),
      scenes: (project.scenes ?? []).map((scene) => sceneWithCounts(project, scene)),
    })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/storyboard/scenes/:sceneId')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok({
      scene: sceneWithCounts(project, scene),
      shots: shotsForScene(project, scene),
      characters: project.characters ?? [],
      environments: project.environments ?? [],
    })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/generate-shots')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    const shots = ensureShotsForScene(project, scene, { force: Boolean(body?.force) })
    return ok({ ...shotProgress(project, scene), shots, started: true })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/shots/progress')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok(shotProgress(project, scene))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/shots/cancel')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok(shotProgress(project, scene))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/generate-all-shot-images')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    if (body?.force) {
      refreshShotImagesForScene(project, scene)
    } else {
      ensureShotsForScene(project, scene)
    }
    return ok(imageProgress(project, scene))
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/shot-images/progress')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok(imageProgress(project, scene))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/shot-images/resume')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok(imageProgress(project, scene))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/storyboard/scenes/:sceneId/shot-images/cancel')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok(imageProgress(project, scene))
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/generation-progress')
  if (params) {
    return ok(sceneProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/scenes')
  if (params) {
    return ok({ scenes: requireProject(params.id).scenes ?? [] })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/scenes/progress')
  if (params) {
    return ok(sceneProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/scenes/start-generation')
  if (params) {
    const project = requireProject(params.id)
    ensureScenes(project)
    return ok({ progress: sceneProgress(project), scenes: project.scenes, project: toApiProject(project) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/scenes/resume-generation')
  if (params) {
    const project = requireProject(params.id)
    ensureScenes(project)
    return ok({ progress: sceneProgress(project) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/scenes/cancel-generation')
  if (params) {
    return ok({ progress: sceneProgress(requireProject(params.id)) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/scenes/:sceneId/retry')
  if (params) {
    return ok(sceneProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/scenes/:sceneId/sceneboard')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok({
      scene: sceneWithCounts(project, scene),
      shots: shotsForScene(project, scene),
    })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/scenes/:sceneId/generate-shots')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    const shots = ensureShotsForScene(project, scene)
    return ok({ ...shotProgress(project, scene), shots, started: true })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/scenes/:sceneId/shots/progress')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok(shotProgress(project, scene))
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/scenes/:sceneId/shots')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    return ok({ shots: shotsForScene(project, scene) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/scenes')
  if (params) {
    const project = requireProject(params.id)
    const scene = {
      id: nextId('scene'),
      adstory_project_id: project.id,
      scene_number: (project.scenes?.length ?? 0) + 1,
      title: body?.title || `Scene ${(project.scenes?.length ?? 0) + 1}`,
      location: body?.location || '',
      time_of_day: body?.time_of_day || '',
      description: body?.description || '',
      mood: body?.mood || '',
      visual_style: body?.visual_style || project.visual_style,
      order_index: project.scenes?.length ?? 0,
      status: 'completed',
      characters: body?.characters ?? [],
      environment: body?.environment || '',
      shot_generation_status: 'not_started',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    project.scenes = [...(project.scenes ?? []), scene]
    saveProject(project)
    return ok({ scene })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/scenes/bulk')
  if (params) {
    const project = requireProject(params.id)
    project.scenes = (body?.scenes ?? []).map((scene, index) => ({
      id: scene.id ?? nextId('scene'),
      adstory_project_id: project.id,
      scene_number: scene.scene_number ?? index + 1,
      title: scene.title ?? `Scene ${index + 1}`,
      location: scene.location ?? '',
      time_of_day: scene.time_of_day ?? '',
      description: scene.description ?? '',
      mood: scene.mood ?? '',
      visual_style: scene.visual_style ?? project.visual_style,
      order_index: scene.order_index ?? index,
      status: scene.status ?? 'completed',
      characters: scene.characters ?? [],
      environment: scene.environment ?? '',
      shot_generation_status: scene.shot_generation_status ?? 'not_started',
    }))
    saveProject(project)
    return ok({ scenes: project.scenes })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/scenes/:sceneId')
  if (params) {
    const project = requireProject(params.id)
    const scene = requireScene(project, params.sceneId)
    Object.assign(scene, body ?? {}, { updated_at: new Date().toISOString() })
    saveProject(project)
    return ok({ scene })
  }

  params = matchRoute(method, path, 'DELETE', '/api/adstory/projects/:id/scenes/:sceneId')
  if (params) {
    const project = requireProject(params.id)
    project.scenes = (project.scenes ?? []).filter((scene) => String(scene.id) !== String(params.sceneId))
    project.shots = (project.shots ?? []).filter(
      (shot) => String(shot.adstory_scene_id ?? shot.scene_id) !== String(params.sceneId)
    )
    saveProject(project)
    return ok({ message: 'Deleted' })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/shots')
  if (params) {
    return ok({ shots: requireProject(params.id).shots ?? [] })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/shots/progress')
  if (params) {
    return ok(shotProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/shots/start-generation')
  if (params) {
    const project = requireProject(params.id)
    for (const scene of project.scenes ?? []) ensureShotsForScene(project, scene)
    return ok(shotProgress(project))
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/shots/bulk')
  if (params) {
    const project = requireProject(params.id)
    project.shots = (body?.shots ?? []).map((shot, index) => ({
      ...shot,
      id: shot.id ?? nextId('shot'),
      adstory_project_id: project.id,
      order_index: shot.order_index ?? index,
    }))
    saveProject(project)
    return ok({ shots: project.shots })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/shots')
  if (params) {
    const project = requireProject(params.id)
    const shot = {
      id: nextId('shot'),
      adstory_project_id: project.id,
      ...body,
      image_status: body?.image_url ? 'completed' : 'none',
      status: 'completed',
      order_index: project.shots?.length ?? 0,
      updated_at: new Date().toISOString(),
    }
    project.shots = [...(project.shots ?? []), shot]
    saveProject(project)
    return ok({ shot })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/shots/:shotId/images')
  if (params) {
    const project = requireProject(params.id)
    const shot = requireShot(project, params.shotId)
    return ok({ images: shot.images ?? shot.shot_images ?? [] })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/shots/:shotId/generate-image')
  if (params) {
    const project = requireProject(params.id)
    const shot = requireShot(project, params.shotId)
    shot.image_url = shot.image_url || IMAGES.wideHarbor
    shot.image_status = 'completed'
    saveProject(project)
    return ok({ shot, image: { id: nextId('image'), image_url: shot.image_url, status: 'completed', is_approved: true } })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/shots/:shotId/director')
  if (params) {
    return ok({
      director: {
        composition: { name: 'Rule of Thirds', reason: 'Keeps the subject readable in a wide frame.' },
        camera: {
          shot_size: 'Medium',
          angle: 'Eye Level',
          movement: 'Static',
          lens: '50mm',
          reason: 'A still medium keeps the performance clear.',
        },
        lighting: { style: 'Practical', reason: 'Match the existing lamp in the scene.' },
        mood: 'Quiet',
        color_palette: 'Warm amber and cool fog',
        notes: 'Test director note from fixtures.',
        updated_prompt: body?.instruction || 'Hold the look, add a little more rim light.',
      },
    })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/shots/:shotId/storyboard-settings')
  if (params) {
    const project = requireProject(params.id)
    const shot = requireShot(project, params.shotId)
    shot.storyboard_settings = { ...(shot.storyboard_settings ?? {}), ...(body ?? {}) }
    Object.assign(shot, body ?? {})
    saveProject(project)
    return ok({ shot })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/shots/:shotId/images/:imageId/approve')
  if (params) {
    const project = requireProject(params.id)
    const shot = requireShot(project, params.shotId)
    return ok({ shot, image: { id: Number(params.imageId), image_url: shot.image_url, is_approved: true, status: 'completed' } })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/shots/:shotId')
  if (params) {
    const project = requireProject(params.id)
    const shot = requireShot(project, params.shotId)
    Object.assign(shot, body ?? {}, { updated_at: new Date().toISOString() })
    saveProject(project)
    return ok({ shot })
  }

  params = matchRoute(method, path, 'DELETE', '/api/adstory/projects/:id/shots/:shotId')
  if (params) {
    const project = requireProject(params.id)
    project.shots = (project.shots ?? []).filter((shot) => String(shot.id) !== String(params.shotId))
    saveProject(project)
    return ok({ message: 'Deleted' })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/characters')
  if (params) {
    return ok({ characters: requireProject(params.id).characters ?? [] })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/characters/progress')
  if (params) {
    return ok(characterProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/characters/start-generation')
  if (params) {
    const project = requireProject(params.id)
    ensureCharacters(project)
    return ok(characterProgress(project))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/characters/resume-generation')
  if (params) {
    const project = requireProject(params.id)
    ensureCharacters(project)
    return ok({ progress: characterProgress(project) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/characters/cancel-generation')
  if (params) {
    return ok({ progress: characterProgress(requireProject(params.id)) })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/characters/bulk')
  if (params) {
    const project = requireProject(params.id)
    project.characters = (body?.characters ?? []).map((character, index) => ({
      ...character,
      id: character.id ?? nextId('character'),
      db_id: character.db_id ?? character.id ?? nextId('character'),
      adstory_project_id: project.id,
      order_index: character.order_index ?? index,
    }))
    saveProject(project)
    return ok({ characters: project.characters })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/characters')
  if (params) {
    const project = requireProject(params.id)
    const id = nextId('character')
    const character = {
      id,
      db_id: id,
      adstory_project_id: project.id,
      name: body?.name || 'New character',
      role: body?.role || '',
      description: body?.description || '',
      personality: body?.personality || '',
      appearance: body?.appearance || '',
      wardrobe: body?.wardrobe || '',
      image_url: body?.image_url || '',
      image_status: body?.image_url ? 'completed' : 'pending',
      status: 'suggested',
      order_index: project.characters?.length ?? 0,
      assets: [],
      ...body,
    }
    project.characters = [...(project.characters ?? []), character]
    saveProject(project)
    return ok({ character })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/characters/:characterId')
  if (params) {
    const project = requireProject(params.id)
    const character = requireCharacter(project, params.characterId)
    Object.assign(character, body ?? {})
    saveProject(project)
    return ok({ character })
  }

  params = matchRoute(method, path, 'DELETE', '/api/adstory/projects/:id/characters/:characterId')
  if (params) {
    const project = requireProject(params.id)
    project.characters = (project.characters ?? []).filter(
      (character) => String(character.id) !== String(params.characterId)
    )
    saveProject(project)
    return ok({ message: 'Deleted' })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/environments')
  if (params) {
    return ok({ environments: requireProject(params.id).environments ?? [] })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/environments/progress')
  if (params) {
    return ok(environmentProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/environments/start-generation')
  if (params) {
    const project = requireProject(params.id)
    ensureEnvironments(project)
    return ok(environmentProgress(project))
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/environments/resume-generation')
  if (params) {
    const project = requireProject(params.id)
    ensureEnvironments(project)
    return ok({ progress: environmentProgress(project) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/environments/cancel-generation')
  if (params) {
    return ok({ progress: environmentProgress(requireProject(params.id)) })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/environments/:environmentId/retry')
  if (params) {
    return ok(environmentProgress(requireProject(params.id)))
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/environments/bulk')
  if (params) {
    const project = requireProject(params.id)
    project.environments = (body?.environments ?? []).map((environment, index) => ({
      ...environment,
      id: environment.id ?? nextId('environment'),
      db_id: environment.db_id ?? environment.id,
      adstory_project_id: project.id,
      order_index: environment.order_index ?? index,
    }))
    saveProject(project)
    return ok({ environments: project.environments })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/environments')
  if (params) {
    const project = requireProject(params.id)
    const id = nextId('environment')
    const environment = {
      id,
      db_id: id,
      adstory_project_id: project.id,
      name: body?.name || 'New environment',
      type: body?.type || '',
      description: body?.description || '',
      image_url: body?.image_url || '',
      image_status: body?.image_url ? 'completed' : 'pending',
      status: 'suggested',
      order_index: project.environments?.length ?? 0,
      assets: [],
      meta: {},
      ...body,
    }
    project.environments = [...(project.environments ?? []), environment]
    saveProject(project)
    return ok({ environment })
  }

  params = matchRoute(method, path, 'PUT', '/api/adstory/projects/:id/environments/:environmentId')
  if (params) {
    const project = requireProject(params.id)
    const environment = requireEnvironment(project, params.environmentId)
    Object.assign(environment, body ?? {})
    saveProject(project)
    return ok({ environment })
  }

  params = matchRoute(method, path, 'DELETE', '/api/adstory/projects/:id/environments/:environmentId')
  if (params) {
    const project = requireProject(params.id)
    project.environments = (project.environments ?? []).filter(
      (environment) => String(environment.id) !== String(params.environmentId)
    )
    saveProject(project)
    return ok({ message: 'Deleted' })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-script')) {
    const project = body?.project_id ? getProjectRef(body.project_id) : null
    const script = SAMPLE_SCRIPT
    if (project) {
      project.script = script
      saveProject(project)
    }
    return ok({ script, project: project ? toApiProject(project) : null })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-screenplay')) {
    const project = body?.project_id ? getProjectRef(body.project_id) : null
    const screenplay = SAMPLE_SCREENPLAY
    if (project) {
      project.screenplay = screenplay
      saveProject(project)
    }
    return ok({ screenplay, project: project ? toApiProject(project) : null })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-scenes')) {
    const project = body?.project_id ? getProjectRef(body.project_id) : null
    const scenes = project ? ensureScenes(project) : sampleScenes(0, nextId('scene'))
    return ok({ scenes, project: project ? toApiProject(project) : null })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-shots')) {
    const project = body?.project_id ? getProjectRef(body.project_id) : null
    if (project) {
      for (const scene of project.scenes ?? []) ensureShotsForScene(project, scene)
    }
    return ok({ shots: project?.shots ?? [], project: project ? toApiProject(project) : null })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/extract-characters')) {
    const project = body?.project_id ? getProjectRef(body.project_id) : null
    const characters = project ? ensureCharacters(project) : sampleCharacters(0, nextId('character'))
    return ok({ characters, project: project ? toApiProject(project) : null })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/extract-environments')) {
    const project = body?.project_id ? getProjectRef(body.project_id) : null
    const environments = project ? ensureEnvironments(project) : sampleEnvironments(0, nextId('environment'))
    return ok({ environments, project: project ? toApiProject(project) : null })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-character-image')) {
    return ok({
      image_url: IMAGES.keeper,
      character: { ...(body?.character ?? {}), image_url: IMAGES.keeper, image_status: 'completed' },
    })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-character-reference')) {
    return ok({
      image_url: IMAGES.stranger,
      reference: { type: 'face', image_url: IMAGES.stranger },
    })
  }

  if (matchRoute(method, path, 'POST', '/api/adstory/generate-environment-image')) {
    return ok({
      image_url: IMAGES.lighthouse,
      environment: { ...(body?.environment ?? {}), image_url: IMAGES.lighthouse, image_status: 'completed' },
    })
  }

  params = matchRoute(method, path, 'POST', '/api/adstory/projects/:id/episodes/plan')
  if (params) {
    return ok({ started: false, episodes: [], episode_count: 0 })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/episodes/:episodeId')
  if (params) {
    return ok({ episode: { id: Number(params.episodeId), title: 'Episode 1' }, scene_count: 0, shot_count: 0 })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/ai-tasks/summary')
  if (params) {
    return ok({ summary: { running: 0, queued: 0, failed: 0, completed: 0 } })
  }

  params = matchRoute(method, path, 'GET', '/api/adstory/projects/:id/ai-tasks/progress')
  if (params) {
    return ok({ status: 'completed', progress_percent: 100 })
  }

  return ok({})
}
