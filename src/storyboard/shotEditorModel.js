export const SHOT_SIZE_OPTIONS = [
  'Close-up',
  'Medium',
  'Wide',
  'Extreme Wide',
  'Over Shoulder',
  'POV',
  'Bird Eye',
  'Low Angle',
  'High Angle',
  'Dutch',
]

export const LENS_OPTIONS = ['24mm', '35mm', '50mm', '85mm', '135mm']

export const CAMERA_MOVEMENT_OPTIONS = [
  'Static',
  'Push In',
  'Pull Out',
  'Pan',
  'Tilt',
  'Tracking',
  'Crane',
  'Drone',
  'Handheld',
]

export const COMPOSITION_OPTIONS = [
  'Rule of Thirds',
  'Centered',
  'Leading Lines',
  'Foreground',
  'Background',
  'Depth',
  'Negative Space',
  'Focus Subject',
]

export const LIGHTING_OPTIONS = [
  'Day',
  'Night',
  'Golden Hour',
  'Blue Hour',
  'Studio',
  'Cinematic',
  'Soft',
  'Hard',
  'Backlight',
  'Silhouette',
  'Neon',
  'Natural',
]

export const MOOD_OPTIONS = [
  'Hopeful',
  'Dark',
  'Suspense',
  'Joy',
  'Romantic',
  'Horror',
  'Epic',
  'Peaceful',
  'Sad',
  'Energetic',
]

export const VISUAL_STYLE_OPTIONS = [
  'Realistic',
  'Netflix',
  'Hollywood',
  'Anime',
  'Pixar',
  'Comic',
  'Documentary',
  'Commercial',
  'Luxury',
  'Fashion',
]

export const CHARACTER_ROLE_OPTIONS = [
  'Main Focus',
  'Background',
  'Walking',
  'Running',
  'Sitting',
]

export const CHARACTER_POSITION_OPTIONS = [
  'Foreground',
  'Center',
  'Background',
  'Left',
  'Right',
]

export const CHARACTER_FACING_OPTIONS = ['Camera', 'Left', 'Right', 'Away', 'Profile']

export const CHARACTER_EXPRESSION_OPTIONS = [
  'Neutral',
  'Happy',
  'Sad',
  'Angry',
  'Surprised',
  'Determined',
]

export const CHARACTER_IMPORTANCE_OPTIONS = ['Primary', 'Secondary', 'Background']

export const ENVIRONMENT_TYPE_OPTIONS = ['Interior', 'Exterior', 'Specific location']

export const WEATHER_OPTIONS = ['Clear', 'Cloudy', 'Rain', 'Snow', 'Fog', 'Storm']

export const SEASON_OPTIONS = ['Spring', 'Summer', 'Autumn', 'Winter']

export const CAMERA_HEIGHT_OPTIONS = ['Ground', 'Eye Level', 'High', 'Overhead']

function readEditorMeta(shot) {
  const meta = shot?.meta ?? {}
  const editor = meta.editor && typeof meta.editor === 'object' ? meta.editor : {}
  return { meta, editor }
}

function normalizeCharacterAssignments(shot, projectCharacters = []) {
  const { editor } = readEditorMeta(shot)
  if (Array.isArray(editor.characterAssignments) && editor.characterAssignments.length) {
    return editor.characterAssignments.map((item) => ({
      characterId: String(item.characterId ?? item.id ?? ''),
      name: item.name ?? '',
      enabled: Boolean(item.enabled),
      role: item.role ?? '',
      position: item.position ?? '',
      facingDirection: item.facingDirection ?? '',
      expression: item.expression ?? '',
      importance: item.importance ?? '',
    }))
  }

  const selectedNames = new Set(
    (Array.isArray(shot?.characters) ? shot.characters : [])
      .map((entry) => (typeof entry === 'string' ? entry : entry?.name))
      .filter(Boolean)
  )

  return projectCharacters.map((character) => ({
    characterId: String(character.id ?? character.apiId ?? ''),
    name: character.name ?? '',
    enabled: selectedNames.has(character.name),
    role: '',
    position: '',
    facingDirection: '',
    expression: '',
    importance: '',
  }))
}

export function createDraftFromShot(shot, projectCharacters = []) {
  if (!shot) return null

  const { meta, editor } = readEditorMeta(shot)

  return {
    shotNumber: shot.shot_number ?? '',
    title: shot.title ?? '',
    description: shot.description ?? '',
    action: shot.action ?? '',
    dialogue: shot.dialogue ?? '',
    notes: editor.notes ?? meta.notes ?? '',
    characterAssignments: normalizeCharacterAssignments(shot, projectCharacters),
    environment: shot.environment ?? '',
    environmentType: editor.environmentType ?? '',
    environmentTime: editor.environmentTime ?? shot.time_of_day ?? '',
    weather: editor.weather ?? '',
    season: editor.season ?? '',
    shotSize: shot.shotSize ?? shot.shot_size ?? '',
    cameraHeight: editor.cameraHeight ?? '',
    cameraAngle: shot.cameraAngle ?? shot.camera_angle ?? '',
    lens: shot.lens ?? '',
    cameraMovement: shot.cameraMovement ?? shot.camera_movement ?? shot.camera ?? '',
    compositionTags: Array.isArray(editor.compositionTags)
      ? [...editor.compositionTags]
      : shot.composition
        ? [shot.composition]
        : [],
    lighting: shot.lighting ?? '',
    mood: shot.mood ?? '',
    visualStyle: editor.visualStyle ?? '',
    prompt: shot.prompt ?? '',
    promptUnlocked: Boolean(editor.promptUnlocked),
  }
}

export function buildPromptPreview(draft) {
  if (!draft) return ''

  const enabledCharacters = draft.characterAssignments
    .filter((item) => item.enabled)
    .map((item) => {
      const parts = [item.name]
      if (item.role) parts.push(`role: ${item.role}`)
      if (item.position) parts.push(`position: ${item.position}`)
      if (item.facingDirection) parts.push(`facing: ${item.facingDirection}`)
      if (item.expression) parts.push(`expression: ${item.expression}`)
      if (item.importance) parts.push(`importance: ${item.importance}`)
      return parts.join(' — ')
    })

  const composition = draft.compositionTags.filter(Boolean).join(', ')
  const lines = [
    draft.title ? `Title: ${draft.title}` : null,
    draft.description ? `Description: ${draft.description}` : null,
    draft.action ? `Action: ${draft.action}` : null,
    draft.dialogue ? `Dialogue: ${draft.dialogue}` : null,
    draft.notes ? `Notes: ${draft.notes}` : null,
    enabledCharacters.length ? `Characters: ${enabledCharacters.join('; ')}` : null,
    draft.environment ? `Environment: ${draft.environment}` : null,
    draft.environmentType ? `Environment type: ${draft.environmentType}` : null,
    draft.environmentTime ? `Time: ${draft.environmentTime}` : null,
    draft.weather ? `Weather: ${draft.weather}` : null,
    draft.season ? `Season: ${draft.season}` : null,
    draft.shotSize ? `Shot size: ${draft.shotSize}` : null,
    draft.cameraHeight ? `Camera height: ${draft.cameraHeight}` : null,
    draft.cameraAngle ? `Camera angle: ${draft.cameraAngle}` : null,
    draft.lens ? `Lens: ${draft.lens}` : null,
    draft.cameraMovement ? `Movement: ${draft.cameraMovement}` : null,
    composition ? `Composition: ${composition}` : null,
    draft.lighting ? `Lighting: ${draft.lighting}` : null,
    draft.mood ? `Mood: ${draft.mood}` : null,
    draft.visualStyle ? `Visual style: ${draft.visualStyle}` : null,
  ]

  return lines.filter(Boolean).join('\n')
}

export function draftToUpdatePayload(draft, shot) {
  const { meta } = readEditorMeta(shot)
  const enabledCharacters = draft.characterAssignments
    .filter((item) => item.enabled)
    .map((item) => item.name)
    .filter(Boolean)

  const promptPreview = buildPromptPreview(draft)

  return {
    shot_number: draft.shotNumber,
    title: draft.title,
    description: draft.description,
    action: draft.action,
    dialogue: draft.dialogue,
    shot_size: draft.shotSize,
    camera_angle: draft.cameraAngle,
    camera_movement: draft.cameraMovement,
    composition: draft.compositionTags.filter(Boolean).join(', '),
    lens: draft.lens,
    lighting: draft.lighting,
    mood: draft.mood,
    environment: draft.environment,
    characters: enabledCharacters,
    prompt: draft.promptUnlocked ? draft.prompt : promptPreview,
    adstory_scene_id: shot.sceneApiId ?? shot.adstory_scene_id ?? null,
    order_index: shot.order_index ?? 0,
    meta: {
      ...meta,
      notes: draft.notes,
      mood: draft.mood,
      editor: {
        notes: draft.notes,
        environmentType: draft.environmentType,
        environmentTime: draft.environmentTime,
        weather: draft.weather,
        season: draft.season,
        cameraHeight: draft.cameraHeight,
        compositionTags: draft.compositionTags,
        visualStyle: draft.visualStyle,
        characterAssignments: draft.characterAssignments,
        promptUnlocked: draft.promptUnlocked,
      },
    },
  }
}

export function draftToCreatePayload(draft, shot, { orderIndex } = {}) {
  const payload = draftToUpdatePayload(draft, shot)
  return {
    ...payload,
    order_index: orderIndex ?? (shot.order_index ?? 0) + 1,
    shot_number: `${draft.shotNumber || shot.shot_number || '1'}-copy`,
    title: draft.title ? `${draft.title} (Copy)` : 'Untitled shot (Copy)',
  }
}

export function areDraftsEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function buildConsistencyWarnings(draft, projectCharacters = [], projectEnvironments = []) {
  const warnings = []
  const enabled = draft.characterAssignments.filter((item) => item.enabled)

  enabled.forEach((assignment) => {
    const character = projectCharacters.find(
      (item) => String(item.id) === String(assignment.characterId)
    )
    if (!character) {
      warnings.push(`Character "${assignment.name}" is not in the project library.`)
      return
    }
    const hasImage = Boolean(character.image_url || character.imageUrl)
    if (!hasImage || character.image_status === 'none') {
      warnings.push(`Character "${assignment.name}" is missing a reference image.`)
    }
  })

  if (draft.environment) {
    const environment = projectEnvironments.find(
      (item) => item.name === draft.environment || String(item.id) === String(draft.environment)
    )
    if (environment && (!environment.image_url || environment.image_status === 'none')) {
      warnings.push(`Environment "${environment.name}" is not generated yet.`)
    }
  }

  return warnings
}
