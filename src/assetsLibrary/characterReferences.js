import { REFERENCE_POSES } from './assetsLibraryData'

export const REFERENCE_STATUS_LABELS = {
  pending: 'Pending',
  generating: 'Generating...',
  completed: 'Completed',
  failed: 'Failed',
}

export function getReferenceStatusLabel(status) {
  return REFERENCE_STATUS_LABELS[status] ?? 'Pending'
}

export function poseIdToReferenceType(poseId) {
  const pose = REFERENCE_POSES.find((item) => item.id === poseId)
  return pose?.referenceType ?? poseId.replace(/-/g, '_')
}

export function indexCharacterReferencesByType(character = {}) {
  const byType = {}
  const raw = character.referencesByType ?? character.references ?? character.reference_images

  if (Array.isArray(raw)) {
    for (const ref of raw) {
      const type = ref.reference_type ?? ref.referenceType ?? ref.type
      if (!type) continue
      byType[type] = normalizeCharacterReference(ref, type)
    }
    return byType
  }

  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (value && typeof value === 'object') {
        byType[key] = normalizeCharacterReference(value, key)
      }
    }
  }

  return byType
}

export function normalizeCharacterReference(ref, referenceType) {
  const imageUrl = ref.image_url ?? ref.imageUrl ?? ref.url ?? null
  const status = normalizeReferenceStatus(ref.status, imageUrl)

  return {
    referenceType: ref.reference_type ?? ref.referenceType ?? referenceType,
    imageUrl,
    status,
    updatedAt: ref.updated_at ?? ref.updatedAt ?? null,
  }
}

function normalizeReferenceStatus(status, imageUrl) {
  const normalized = String(status ?? '').toLowerCase()
  if (normalized === 'generating' || normalized === 'completed' || normalized === 'failed') {
    return normalized
  }
  if (normalized === 'complete' || normalized === 'done') {
    return 'completed'
  }
  if (imageUrl) {
    return 'completed'
  }
  return 'pending'
}

export function mapHeroImageStatusToReferenceStatus(heroImageStatus) {
  const status = String(heroImageStatus ?? 'pending').toLowerCase()
  if (status === 'generating') return 'generating'
  if (status === 'completed') return 'completed'
  if (status === 'failed') return 'failed'
  return 'pending'
}

export function mergeReferenceIntoCharacter(character, reference) {
  if (!character || !reference) return character

  const normalized = normalizeCharacterReference(reference, reference.reference_type ?? reference.referenceType)
  const existing = Array.isArray(character.references) ? character.references : []
  const nextReferences = existing.filter(
    (item) => (item.reference_type ?? item.referenceType) !== normalized.referenceType
  )

  nextReferences.push({
    reference_type: normalized.referenceType,
    image_url: normalized.imageUrl,
    status: normalized.status,
    updated_at: normalized.updatedAt ?? new Date().toISOString(),
  })

  return {
    ...character,
    hero_image_url: character.hero_image_url ?? character.heroImageUrl ?? null,
    hero_image_status: character.hero_image_status ?? character.heroImageStatus ?? 'pending',
    updated_at: character.updated_at ?? character.updatedAt ?? null,
    references: nextReferences,
  }
}

export const PARTIAL_REFERENCE_FAILURE_MESSAGE =
  'Hero image generated. Some references failed and can be retried.'

export function hasPartialReferenceFailures(summary, references = []) {
  if (summary && typeof summary === 'object') {
    const failedCount =
      summary.failed ??
      summary.failed_count ??
      summary.failedCount ??
      summary.references_failed ??
      0

    if (Number(failedCount) > 0) {
      return true
    }

    if (summary.partial_success === true) {
      return true
    }

    if (summary.all_references_completed === false) {
      return true
    }
  }

  if (!Array.isArray(references)) {
    return false
  }

  return references.some(
    (ref) => normalizeReferenceStatus(ref.status, ref.image_url ?? ref.imageUrl) === 'failed'
  )
}

export function referencesFromCharacter(character) {
  if (Array.isArray(character?.references)) {
    return character.references
  }

  return []
}

export function normalizeApiReference(data) {
  if (!data || typeof data !== 'object') return null

  const referenceType = data.reference_type ?? data.referenceType ?? data.type
  if (!referenceType) return null

  return {
    reference_type: referenceType,
    image_url: data.image_url ?? data.imageUrl ?? data.url ?? null,
    status: data.status ?? (data.image_url || data.imageUrl ? 'completed' : 'pending'),
    updated_at: data.updated_at ?? data.updatedAt ?? new Date().toISOString(),
  }
}

export function mergeReferenceLists(base = [], incoming = []) {
  const byType = {}

  for (const ref of base) {
    const normalized = normalizeApiReference(ref) ?? ref
    const type = normalized.reference_type ?? normalized.referenceType
    if (type) byType[type] = normalized
  }

  for (const ref of incoming) {
    const normalized = normalizeApiReference(ref) ?? ref
    const type = normalized.reference_type ?? normalized.referenceType
    if (type) byType[type] = normalized
  }

  return Object.values(byType)
}

export function upsertReferencesByCharacterId(prev = {}, characterId, newRef) {
  const id = String(characterId)
  const current = prev[id] ?? []

  return {
    ...prev,
    [id]: upsertCharacterReferences(current, newRef),
  }
}

export function mergeReferencesByCharacterIdFromProject(prev = {}, characters = []) {
  const next = { ...prev }

  for (const character of characters) {
    const id = String(character.id)
    const fromProject = referencesFromCharacter(character)

    if (fromProject.length > 0) {
      next[id] = mergeReferenceLists(prev[id] ?? [], fromProject)
    }
  }

  return next
}

export function resolveCharacterReferences(
  referencesByCharacterId,
  characterId,
  selectedCharacter = null
) {
  if (characterId == null) return []

  const id = String(characterId)
  const local = referencesByCharacterId[id]
  if (local?.length) return local

  const fromCharacter = referencesFromCharacter(selectedCharacter)
  if (fromCharacter.length) return fromCharacter

  return []
}

export function mergeCharacterUpdatePreservingReferences(
  existingCharacter,
  updatedCharacter,
  preservedReferences = []
) {
  const fromUpdated = referencesFromCharacter(updatedCharacter)
  const fromExisting = referencesFromCharacter(existingCharacter)
  const refs =
    fromUpdated.length > 0
      ? mergeReferenceLists(preservedReferences, fromUpdated)
      : mergeReferenceLists(fromExisting, preservedReferences)

  return {
    ...(existingCharacter ?? {}),
    ...(updatedCharacter ?? {}),
    id: updatedCharacter?.id ?? existingCharacter?.id,
    hero_image_url:
      updatedCharacter?.hero_image_url ??
      updatedCharacter?.heroImageUrl ??
      existingCharacter?.hero_image_url ??
      existingCharacter?.heroImageUrl ??
      null,
    hero_image_status:
      updatedCharacter?.hero_image_status ??
      updatedCharacter?.heroImageStatus ??
      existingCharacter?.hero_image_status ??
      existingCharacter?.heroImageStatus ??
      'pending',
    updated_at:
      updatedCharacter?.updated_at ??
      updatedCharacter?.updatedAt ??
      existingCharacter?.updated_at ??
      existingCharacter?.updatedAt ??
      null,
    references: refs,
  }
}

export function upsertCharacterReferences(prev = [], newRef) {
  if (!newRef?.reference_type) return prev

  const exists = prev.some((ref) => ref.reference_type === newRef.reference_type)

  if (exists) {
    return prev.map((ref) => (ref.reference_type === newRef.reference_type ? newRef : ref))
  }

  return [...prev, newRef]
}

export function findReferenceInCharacter(character, referenceType) {
  if (!character || !referenceType) return null

  const refs = character.references ?? character.reference_images ?? []
  if (!Array.isArray(refs)) return null

  return (
    refs.find(
      (ref) => (ref.reference_type ?? ref.referenceType ?? ref.type) === referenceType
    ) ?? null
  )
}

export function characterHasHeroImage(character) {
  if (!character) return false

  return Boolean(character.heroImageUrl ?? character.hero_image_url)
}

export const HERO_BATCH_REFERENCE_TYPES = [
  'front_view',
  'back_view',
  'left_profile',
  'right_profile',
]

export function extractBasicReferencesFromHeroResponse(response = {}) {
  const raw =
    response.references ??
    response.character?.references ??
    response.character?.reference_images ??
    []

  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((ref) => normalizeApiReference(ref))
    .filter(Boolean)
    .filter((ref) => HERO_BATCH_REFERENCE_TYPES.includes(ref.reference_type))
}

export function mergeHeroAndBasicReferencesResponse(existingCharacter, response = {}) {
  const apiCharacter = response.character ?? {}
  const basicReferences = extractBasicReferencesFromHeroResponse(response)
  const existingRefs = referencesFromCharacter(existingCharacter)
  const mergedRefs = mergeReferenceLists(existingRefs, basicReferences)

  const updatedAt =
    apiCharacter.updated_at ??
    apiCharacter.updatedAt ??
    existingCharacter?.updated_at ??
    existingCharacter?.updatedAt ??
    new Date().toISOString()

  return {
    ...existingCharacter,
    ...apiCharacter,
    id: apiCharacter.id ?? existingCharacter?.id,
    hero_image_url:
      apiCharacter.hero_image_url ??
      apiCharacter.heroImageUrl ??
      existingCharacter?.hero_image_url ??
      existingCharacter?.heroImageUrl ??
      null,
    hero_image_status:
      apiCharacter.hero_image_status ??
      apiCharacter.heroImageStatus ??
      existingCharacter?.hero_image_status ??
      existingCharacter?.heroImageStatus ??
      'completed',
    references: mergedRefs,
    updated_at: updatedAt,
  }
}

export function mergeHeroImageOnlyResponse(existingCharacter, response = {}) {
  const apiCharacter = response.character ?? {}

  const updatedAt =
    apiCharacter.updated_at ??
    apiCharacter.updatedAt ??
    existingCharacter?.updated_at ??
    existingCharacter?.updatedAt ??
    new Date().toISOString()

  return {
    ...existingCharacter,
    ...apiCharacter,
    id: apiCharacter.id ?? existingCharacter?.id,
    hero_image_url:
      apiCharacter.hero_image_url ??
      apiCharacter.heroImageUrl ??
      existingCharacter?.hero_image_url ??
      existingCharacter?.heroImageUrl ??
      null,
    hero_image_status:
      apiCharacter.hero_image_status ??
      apiCharacter.heroImageStatus ??
      existingCharacter?.hero_image_status ??
      existingCharacter?.heroImageStatus ??
      'completed',
    references: existingCharacter?.references ?? [],
    updated_at: updatedAt,
  }
}

export function mergeHeroGenerationResponse(existingCharacter, response = {}) {
  const apiCharacter = response.character ?? {}
  const references =
    response.references ??
    apiCharacter.references ??
    apiCharacter.reference_images ??
    existingCharacter?.references ??
    []

  const updatedAt =
    apiCharacter.updated_at ??
    apiCharacter.updatedAt ??
    existingCharacter?.updated_at ??
    existingCharacter?.updatedAt ??
    new Date().toISOString()

  return {
    ...existingCharacter,
    ...apiCharacter,
    id: apiCharacter.id ?? existingCharacter?.id,
    hero_image_url:
      apiCharacter.hero_image_url ??
      apiCharacter.heroImageUrl ??
      existingCharacter?.hero_image_url ??
      existingCharacter?.heroImageUrl ??
      null,
    hero_image_status:
      apiCharacter.hero_image_status ??
      apiCharacter.heroImageStatus ??
      existingCharacter?.hero_image_status ??
      existingCharacter?.heroImageStatus ??
      'completed',
    references,
    updated_at: updatedAt,
  }
}
