const GENERATION_STATUS_UI = {
  not_generated: {
    label: 'Not Generated',
    tone: 'not_generated',
  },
  generating: {
    label: 'Generating...',
    tone: 'generating',
  },
  completed: {
    label: 'Completed',
    tone: 'completed',
  },
  failed: {
    label: 'Failed',
    tone: 'failed',
  },
}

function normalizeGenerationStatus(status) {
  const value = String(status ?? 'pending').toLowerCase()

  if (value === 'completed' || value === 'done' || value === 'ready') {
    return 'completed'
  }

  if (value === 'failed' || value === 'error') {
    return 'failed'
  }

  if (
    value === 'generating' ||
    value === 'creating' ||
    value === 'queued' ||
    value === 'in_progress' ||
    value === 'processing'
  ) {
    return 'generating'
  }

  return 'not_generated'
}

export function readCharacterGenerationStatus(character = {}, { forceGenerating = false } = {}) {
  if (forceGenerating) {
    return GENERATION_STATUS_UI.generating
  }

  const raw = character.heroImageStatus ?? character.hero_image_status ?? 'pending'
  return GENERATION_STATUS_UI[normalizeGenerationStatus(raw)]
}

export function readEnvironmentGenerationStatus(environment = {}, { forceGenerating = false } = {}) {
  if (forceGenerating) {
    return GENERATION_STATUS_UI.generating
  }

  const raw = environment.imageStatus ?? environment.image_status ?? 'pending'
  return GENERATION_STATUS_UI[normalizeGenerationStatus(raw)]
}

export function isGenerationComplete(statusUi) {
  return statusUi?.tone === 'completed'
}

export function allCharactersGenerated(
  characters = [],
  { generatingIds = null, isBuildingAll = false } = {}
) {
  if (!characters.length) return false
  if (generatingIds?.size) return false
  if (isBuildingAll) return false

  return characters.every((character) => {
    const raw = String(character.heroImageStatus ?? character.hero_image_status ?? '').toLowerCase()
    return raw === 'completed'
  })
}

export function allEnvironmentsGenerated(
  environments = [],
  { generatingIds = null, isBuildingAll = false } = {}
) {
  if (!environments.length) return false
  if (generatingIds?.size) return false
  if (isBuildingAll) return false

  return environments.every((environment) => {
    const raw = String(environment.imageStatus ?? environment.image_status ?? '').toLowerCase()
    return raw === 'completed'
  })
}
