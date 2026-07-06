import { HERO_BATCH_REFERENCE_TYPES } from './characterReferences'

export const IDENTITY_GENERATION_STATUS_LABELS = {
  queued: 'Waiting...',
  generating: 'Generating...',
  completed: 'Completed',
  failed: 'Failed',
  pending: 'Pending',
}

export const BASIC_IDENTITY_REFERENCE_TYPES = ['hero_portrait', ...HERO_BATCH_REFERENCE_TYPES]

export function getIdentityGenerationStatusLabel(status) {
  return IDENTITY_GENERATION_STATUS_LABELS[status] ?? IDENTITY_GENERATION_STATUS_LABELS.pending
}

export function readIdentityGenerationStatus(character = {}) {
  return (
    character.identity_generation_status ??
    character.identityGenerationStatus ??
    'pending'
  )
}

export function allIdentitiesCompleted(characters = []) {
  if (!characters.length) return true

  return characters.every(
    (character) => readIdentityGenerationStatus(character) === 'completed'
  )
}

export function needsIdentityGeneration(characters = []) {
  if (!characters.length) return false

  return characters.some((character) => {
    const status = readIdentityGenerationStatus(character)
    if (status === 'completed') return false
    if (status === 'failed') return true
    if (status === 'queued' || status === 'generating') return true

    const heroStatus = String(
      character.hero_image_status ?? character.heroImageStatus ?? 'pending'
    ).toLowerCase()

    return heroStatus !== 'completed' && !(character.hero_image_url ?? character.heroImageUrl)
  })
}

export function isGenerationFinished(status = {}, characterCount = 0) {
  const total = Number(status.total ?? 0)
  const effectiveTotal = total > 0 ? total : characterCount

  if (effectiveTotal <= 0) return false

  const completed = Number(status.completed ?? 0)
  const failed = Number(status.failed ?? 0)
  return completed + failed >= effectiveTotal
}

export function isGenerationActive(status = {}) {
  const queued = Number(status.queued ?? 0)
  const generating = Number(status.generating ?? 0)
  return queued > 0 || generating > 0
}

function normalizeStatusReference(ref, referenceType) {
  if (!ref) return null

  const imageUrl = ref.image_url ?? ref.imageUrl ?? ref.url ?? null
  return {
    reference_type: ref.reference_type ?? ref.referenceType ?? referenceType,
    image_url: imageUrl,
    status: ref.status ?? (imageUrl ? 'completed' : 'pending'),
    updated_at: ref.updated_at ?? ref.updatedAt ?? null,
  }
}

function referencesFromStatusCharacter(statusCharacter = {}) {
  const raw =
    statusCharacter.references ??
    statusCharacter.reference_images ??
    statusCharacter.references_by_type ??
    []

  if (Array.isArray(raw)) {
    return raw
      .map((ref) =>
        normalizeStatusReference(ref, ref.reference_type ?? ref.referenceType)
      )
      .filter(Boolean)
  }

  if (raw && typeof raw === 'object') {
    return Object.entries(raw)
      .map(([type, ref]) => normalizeStatusReference(ref, type))
      .filter(Boolean)
  }

  return []
}

function isIdentityPipelineStatus(value) {
  return ['pending', 'queued', 'generating', 'completed', 'failed'].includes(
    String(value ?? '').toLowerCase()
  )
}

export function mergeStatusCharacterIntoProjectCharacter(existing = {}, statusCharacter = {}) {
  if (!statusCharacter?.id) return existing

  const rawStatus =
    statusCharacter.identity_generation_status ??
    statusCharacter.identityGenerationStatus ??
    null

  const identityStatus = isIdentityPipelineStatus(rawStatus)
    ? rawStatus
    : isIdentityPipelineStatus(statusCharacter.status)
      ? statusCharacter.status
      : readIdentityGenerationStatus(existing)

  const statusRefs = referencesFromStatusCharacter(statusCharacter)
  const existingRefs = Array.isArray(existing.references) ? existing.references : []
  const refsByType = new Map(
    existingRefs.map((ref) => [ref.reference_type ?? ref.referenceType, ref])
  )

  for (const ref of statusRefs) {
    refsByType.set(ref.reference_type, ref)
  }

  const updatedAt =
    statusCharacter.updated_at ??
    statusCharacter.updatedAt ??
    existing.updated_at ??
    existing.updatedAt ??
    null

  return {
    ...existing,
    ...statusCharacter,
    id: statusCharacter.id ?? existing.id,
    identity_generation_status: identityStatus,
    identityGenerationStatus: identityStatus,
    hero_image_url:
      statusCharacter.hero_image_url ??
      statusCharacter.heroImageUrl ??
      existing.hero_image_url ??
      existing.heroImageUrl ??
      null,
    heroImageUrl:
      statusCharacter.hero_image_url ??
      statusCharacter.heroImageUrl ??
      existing.heroImageUrl ??
      existing.hero_image_url ??
      null,
    hero_image_status:
      statusCharacter.hero_image_status ??
      statusCharacter.heroImageStatus ??
      existing.hero_image_status ??
      existing.heroImageStatus ??
      'pending',
    heroImageStatus:
      statusCharacter.hero_image_status ??
      statusCharacter.heroImageStatus ??
      existing.heroImageStatus ??
      existing.hero_image_status ??
      'pending',
    updated_at: updatedAt,
    updatedAt,
    references: Array.from(refsByType.values()),
  }
}

export function applyGenerationStatusToCharacters(characters = [], statusData = {}) {
  const statusCharacters = statusData.characters ?? []
  if (!statusCharacters.length) return characters

  const byId = new Map(statusCharacters.map((character) => [String(character.id), character]))

  return characters.map((character) => {
    const statusCharacter = byId.get(String(character.id))
    if (!statusCharacter) return character
    return mergeStatusCharacterIntoProjectCharacter(character, statusCharacter)
  })
}

export function buildLiveCharactersFromStatus(baseCharacters = [], statusData = {}) {
  const statusCharacters = statusData?.characters ?? []
  if (!statusCharacters.length) {
    return applyGenerationStatusToCharacters(baseCharacters, statusData)
  }

  const baseById = new Map(baseCharacters.map((character) => [String(character.id), character]))

  return statusCharacters.map((statusCharacter) => {
    const existing = baseById.get(String(statusCharacter.id)) ?? {}
    return mergeStatusCharacterIntoProjectCharacter(existing, statusCharacter)
  })
}

export function getCharacterIdentityStatusMap(statusData = {}) {
  const map = new Map()

  for (const character of statusData.characters ?? []) {
    if (character?.id == null) continue
    map.set(String(character.id), {
      status:
        character.identity_generation_status ??
        character.status ??
        'pending',
      heroImageStatus: character.hero_image_status ?? character.heroImageStatus ?? 'pending',
      heroImageUrl: character.hero_image_url ?? character.heroImageUrl ?? null,
      updatedAt: character.updated_at ?? character.updatedAt ?? null,
    })
  }

  return map
}
