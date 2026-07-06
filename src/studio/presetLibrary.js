export const CREATIVE_PRESET_SECTIONS = [
  {
    key: 'composition',
    label: 'Composition',
    options: [
      'Rule of Thirds',
      'Centered Subject',
      'Symmetrical',
      'Over the Shoulder',
      'Leading Lines',
    ],
  },
  {
    key: 'shotSize',
    label: 'Shot Size',
    options: ['Extreme Wide', 'Wide', 'Medium', 'Close Up', 'Extreme Close Up'],
  },
  {
    key: 'cameraMovement',
    label: 'Camera Movement',
    options: ['Static', 'Slow Push In', 'Tracking Shot', 'Handheld', 'Drone Shot'],
  },
  {
    key: 'lighting',
    label: 'Lighting',
    options: ['Golden Hour', 'Moonlight', 'Neon', 'Soft Studio', 'Harsh Shadow'],
  },
  {
    key: 'environment',
    label: 'Environment',
    options: ['Ocean', 'City Street', 'Village', 'Office', 'Forest'],
  },
  {
    key: 'mood',
    label: 'Mood',
    options: ['Emotional', 'Suspenseful', 'Hopeful', 'Luxury', 'Documentary'],
  },
  {
    key: 'cinematographyStyle',
    label: 'Cinematography Style',
    options: [
      'African Cinema',
      'Commercial Ad',
      'Documentary',
      'Music Video',
      'Luxury Brand',
      'Social Media Reel',
    ],
  },
  {
    key: 'characterDirection',
    label: 'Character Direction',
    options: [
      'Looking Away',
      'Walking Slowly',
      'Holding Product',
      'Emotional Closeup',
      'Talking to Camera',
    ],
  },
]

const CAMERA_MAP = {
  Static: 'Static',
  'Pan Left': 'Tracking Shot',
  'Pan Right': 'Tracking Shot',
  'Tilt Up': 'Slow Push In',
  'Dolly In': 'Slow Push In',
}

const MOOD_MAP = {
  Hopeful: 'Hopeful',
  Mysterious: 'Suspenseful',
  Tense: 'Suspenseful',
  Serene: 'Emotional',
  Epic: 'Luxury',
}

const ENVIRONMENT_MAP = {
  ocean: 'Ocean',
  boat: 'Ocean',
  underwater: 'Ocean',
  whale: 'Ocean',
  forest: 'Forest',
  city: 'City Street',
  office: 'Office',
  village: 'Village',
}

function inferEnvironment(shot) {
  const assignedName =
    typeof shot?.environment === 'object' ? (shot.environment?.name ?? '') : ''
  const sceneContext =
    shot?.sceneContext ?? (typeof shot?.environment === 'string' ? shot.environment : '')
  const text = `${sceneContext} ${assignedName} ${shot.label ?? ''}`.toLowerCase()
  for (const [keyword, value] of Object.entries(ENVIRONMENT_MAP)) {
    if (text.includes(keyword)) return value
  }
  return 'Ocean'
}

function pickOption(sectionKey, value, options) {
  if (!value) return options[0]
  return options.includes(value) ? value : options[0]
}

export function getDefaultCreativeSelections(shot) {
  const presets = shot?.presets ?? {}

  return {
    composition: pickOption('composition', presets.composition, CREATIVE_PRESET_SECTIONS[0].options),
    shotSize: pickOption('shotSize', presets.shotSize, CREATIVE_PRESET_SECTIONS[1].options),
    cameraMovement: pickOption(
      'cameraMovement',
      CAMERA_MAP[presets.camera] ?? presets.camera,
      CREATIVE_PRESET_SECTIONS[2].options,
    ),
    lighting: pickOption('lighting', presets.lighting, CREATIVE_PRESET_SECTIONS[3].options),
    environment: inferEnvironment(shot),
    mood: pickOption('mood', MOOD_MAP[presets.mood] ?? presets.mood, CREATIVE_PRESET_SECTIONS[5].options),
    cinematographyStyle: 'Commercial Ad',
    characterDirection: 'Looking Away',
  }
}

export function formatCreativeSummary(selections) {
  return CREATIVE_PRESET_SECTIONS.map((section) => ({
    label: section.label,
    value: selections[section.key] ?? '—',
  }))
}
