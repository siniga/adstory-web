import {
  isGenerationTerminal,
  normalizeGenerationProgress,
  PROJECT_GEN_STATUS,
} from './aiGenerationStatus'

export const CHARACTER_IMAGE_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  GENERATING: 'generating',
  COMPLETED: 'completed',
  FAILED: 'failed',
}

const IMAGE_STATUS_RANK = {
  [CHARACTER_IMAGE_STATUS.PENDING]: 0,
  [CHARACTER_IMAGE_STATUS.QUEUED]: 1,
  [CHARACTER_IMAGE_STATUS.GENERATING]: 2,
  [CHARACTER_IMAGE_STATUS.FAILED]: 3,
  [CHARACTER_IMAGE_STATUS.COMPLETED]: 4,
}

export function characterImageStatusRank(status) {
  if (status == null || status === '') return -1
  return IMAGE_STATUS_RANK[status] ?? -1
}

export function pickPreferredCharacterImageStatus(existingStatus, incomingStatus) {
  const existingRank = characterImageStatusRank(existingStatus)
  const incomingRank = characterImageStatusRank(incomingStatus)

  if (incomingRank > existingRank) return incomingStatus
  if (existingRank > incomingRank) return existingStatus
  return incomingStatus ?? existingStatus ?? null
}

function normalizeCharacterImageStatus(rawStatus, imageUrl) {
  const status = String(rawStatus ?? '')
    .trim()
    .toLowerCase()

  const aliased =
    {
      complete: CHARACTER_IMAGE_STATUS.COMPLETED,
      completed: CHARACTER_IMAGE_STATUS.COMPLETED,
      done: CHARACTER_IMAGE_STATUS.COMPLETED,
      success: CHARACTER_IMAGE_STATUS.COMPLETED,
      ready: CHARACTER_IMAGE_STATUS.COMPLETED,
      processing: CHARACTER_IMAGE_STATUS.GENERATING,
      running: CHARACTER_IMAGE_STATUS.GENERATING,
      in_progress: CHARACTER_IMAGE_STATUS.GENERATING,
      queued: CHARACTER_IMAGE_STATUS.QUEUED,
      generating: CHARACTER_IMAGE_STATUS.GENERATING,
      failed: CHARACTER_IMAGE_STATUS.FAILED,
      error: CHARACTER_IMAGE_STATUS.FAILED,
      pending: CHARACTER_IMAGE_STATUS.PENDING,
    }[status] ?? status

  if (imageUrl && aliased !== CHARACTER_IMAGE_STATUS.FAILED) {
    return CHARACTER_IMAGE_STATUS.COMPLETED
  }

  if (!aliased) {
    return imageUrl ? CHARACTER_IMAGE_STATUS.COMPLETED : CHARACTER_IMAGE_STATUS.PENDING
  }

  return aliased
}

export function normalizeCharacterRecord(character) {
  if (!character) return character

  const assets = Array.isArray(character.assets) ? character.assets : []
  const primaryAsset =
    assets.find((asset) => asset.is_primary && asset.image_url) ??
    assets.find((asset) => asset.image_url) ??
    null

  const imageUrl =
    character.image_url ??
    character.imageUrl ??
    character.hero_image_url ??
    character.heroImageUrl ??
    primaryAsset?.image_url ??
    ''

  const image_status = normalizeCharacterImageStatus(
    character.image_status ?? character.imageStatus ?? character.heroImageStatus,
    imageUrl
  )

  return {
    ...character,
    image_url: imageUrl,
    image_status,
  }
}

export function normalizeCharacterList(characters = []) {
  return characters.map((character) => normalizeCharacterRecord(character))
}

export function characterHasPortrait(character) {
  const normalized = normalizeCharacterRecord(character)
  return Boolean(normalized.image_url?.trim())
}

export function isCharacterGenerating(character) {
  const normalized = normalizeCharacterRecord(character)
  const status = normalized.image_status
  return (
    status === CHARACTER_IMAGE_STATUS.QUEUED ||
    status === CHARACTER_IMAGE_STATUS.GENERATING
  )
}

export function getCharacterDisplayStatus(character) {
  const normalized = normalizeCharacterRecord(character)
  if (characterHasPortrait(normalized)) {
    return 'Completed'
  }

  const status = normalized.image_status ?? CHARACTER_IMAGE_STATUS.PENDING
  switch (status) {
    case CHARACTER_IMAGE_STATUS.QUEUED:
      return 'Queued'
    case CHARACTER_IMAGE_STATUS.GENERATING:
      return 'Generating…'
    case CHARACTER_IMAGE_STATUS.COMPLETED:
      return 'Portrait ready'
    case CHARACTER_IMAGE_STATUS.FAILED:
      return 'Failed'
    default:
      return 'Not generated'
  }
}

export function hasProjectCharacters(characters = []) {
  return characters.length > 0
}

export function mergeCharacterRecord(existing, incoming) {
  const normalizedExisting = normalizeCharacterRecord(existing)
  const normalizedIncoming = normalizeCharacterRecord(incoming)

  if (!normalizedExisting) return normalizedIncoming
  if (!normalizedIncoming) return normalizedExisting

  const existingRank = characterImageStatusRank(normalizedExisting.image_status)
  const incomingRank = characterImageStatusRank(normalizedIncoming.image_status)

  if (
    normalizedExisting.image_status === CHARACTER_IMAGE_STATUS.COMPLETED &&
    incomingRank >= 0 &&
    incomingRank < existingRank
  ) {
    return normalizedExisting
  }

  if (normalizedExisting.image_url && !normalizedIncoming.image_url) {
    console.log('[Blocked overwrite] tried to remove image_url', {
      name: normalizedExisting.name ?? normalizedExisting.id,
    })
  }

  const imageStatus = pickPreferredCharacterImageStatus(
    normalizedExisting.image_status,
    normalizedIncoming.image_status
  )
  const resolvedImageStatus =
    normalizedExisting.image_status === CHARACTER_IMAGE_STATUS.COMPLETED &&
    imageStatus !== CHARACTER_IMAGE_STATUS.FAILED
      ? CHARACTER_IMAGE_STATUS.COMPLETED
      : imageStatus
  const incomingAuthoritative = incomingRank >= existingRank
  const base = incomingAuthoritative ? normalizedIncoming : normalizedExisting
  const supplemental = incomingAuthoritative ? normalizedExisting : normalizedIncoming

  const merged = {
    ...supplemental,
    ...base,
    id: normalizedExisting.id ?? normalizedIncoming.id,
    image_status: resolvedImageStatus,
    image_url: normalizedIncoming.image_url || normalizedExisting.image_url || '',
    assets: normalizedIncoming.assets?.length
      ? normalizedIncoming.assets
      : normalizedExisting.assets ?? [],
    references: normalizedIncoming.references?.length
      ? normalizedIncoming.references
      : normalizedExisting.references ?? [],
    heroImageUrl: normalizedIncoming.heroImageUrl || normalizedExisting.heroImageUrl || '',
    hero_image_url: normalizedIncoming.hero_image_url || normalizedExisting.hero_image_url || '',
  }

  return normalizeCharacterRecord(merged)
}

export function logCharactersUpdate(sourceName, characters = []) {
  const snapshot = normalizeCharacterList(characters).map((character) => ({
    id: character.id,
    name: character.name,
    image_url: character.image_url || null,
    image_status: character.image_status ?? null,
  }))
  console.log('Updating characters from:', sourceName, snapshot)
  return characters
}

function characterMergeKey(character) {
  return String(character?.id ?? character?.name ?? '')
}

export function mergeCharacterListsPreservingPortraits(current = [], incoming = []) {
  if (!incoming.length) return normalizeCharacterList(current)
  if (!current.length) return normalizeCharacterList(incoming)

  const currentByKey = new Map()
  normalizeCharacterList(current).forEach((character) => {
    const key = characterMergeKey(character)
    if (key) currentByKey.set(key, character)
  })

  const seen = new Set()
  const merged = normalizeCharacterList(incoming).map((incomingCharacter) => {
    const key = characterMergeKey(incomingCharacter)
    if (key) seen.add(key)
    const existing = key ? currentByKey.get(key) : null
    return mergeCharacterRecord(existing, incomingCharacter)
  })

  currentByKey.forEach((existing, key) => {
    if (!seen.has(key)) {
      merged.push(existing)
    }
  })

  return merged
}

export function patchCharactersFromProgress(current = [], incoming = []) {
  return mergeCharacterListsPreservingPortraits(current, incoming)
}

export function mergeCharacters(current = [], incoming = []) {
  if (!incoming.length) return current

  return incoming.map((incomingCharacter) => {
    const existing = current.find(
      (character) =>
        (incomingCharacter.id != null && String(character.id) === String(incomingCharacter.id)) ||
        (incomingCharacter.name &&
          character.name &&
          character.name.toLowerCase() === incomingCharacter.name.toLowerCase())
    )

    return mergeCharacterRecord(existing, incomingCharacter)
  })
}

export function mergeCharactersWithPriority({
  fullProjectCharacters = [],
  progressCharacters = [],
  localCharacters = [],
  fallbackCharacters = [],
} = {}) {
  const normalizedFull = normalizeCharacterList(fullProjectCharacters)
  const normalizedProgress = normalizeCharacterList(progressCharacters)
  const normalizedLocal = normalizeCharacterList(localCharacters)
  const normalizedFallback = normalizeCharacterList(fallbackCharacters)

  const primary =
    normalizedFull.length > 0
      ? normalizedFull
      : normalizedProgress.length > 0
        ? normalizedProgress
        : normalizedLocal.length > 0
          ? normalizedLocal
          : normalizedFallback

  if (!primary.length) return []

  if (normalizedFull.length) {
    const base = normalizedLocal.length ? normalizedLocal : normalizedFallback
    return base.length
      ? mergeCharacterListsPreservingPortraits(base, normalizedFull)
      : normalizedFull
  }

  let merged = primary
  if (normalizedProgress.length) {
    merged = patchCharactersFromProgress(merged, normalizedProgress)
  }

  if (normalizedLocal.length && !normalizedFull.length && !normalizedProgress.length) {
    merged = mergeCharacters(merged, normalizedLocal)
  }

  return merged
}

export function shouldAutoStartCharacterGeneration(status, { characters = [] } = {}) {
  if (hasProjectCharacters(characters)) return false
  if (
    status === PROJECT_GEN_STATUS.COMPLETED ||
    status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS ||
    status === PROJECT_GEN_STATUS.CANCELLED ||
    status === PROJECT_GEN_STATUS.RUNNING ||
    status === PROJECT_GEN_STATUS.STALLED ||
    status === PROJECT_GEN_STATUS.FAILED
  ) {
    return false
  }
  return true
}

export function allCharactersPortraitComplete(characters = []) {
  const normalized = normalizeCharacterList(characters)
  if (!normalized.length) return false

  return normalized.every(
    (character) =>
      characterHasPortrait(character) ||
      character.image_status === CHARACTER_IMAGE_STATUS.COMPLETED ||
      character.image_status === CHARACTER_IMAGE_STATUS.FAILED
  )
}

export function areCharactersGenerationSettled(characters = []) {
  const normalized = normalizeCharacterList(characters)
  if (!normalized.length) return false
  return !normalized.some((character) => isCharacterGenerating(character))
}

export function shouldStopCharacterPolling(progress, characters = []) {
  const normalized = normalizeCharacterList(characters)

  if (normalized.length > 0 && areCharactersGenerationSettled(normalized)) {
    if (allCharactersPortraitComplete(normalized)) {
      return true
    }
  }

  if (progress && isGenerationTerminal(progress.status)) {
    return true
  }

  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const failed = progress?.failed ?? 0

  if (total > 0 && completed + failed >= total) {
    return true
  }

  if (normalized.length > 0 && allCharactersPortraitComplete(normalized)) {
    return true
  }

  return hasProjectCharacters(normalized) && progress?.status === PROJECT_GEN_STATUS.COMPLETED
}

export function normalizeCharacterGenerationProgress(progress, characters = []) {
  const normalized = normalizeCharacterList(characters)
  const isComplete =
    hasProjectCharacters(normalized) &&
    (progress?.status === PROJECT_GEN_STATUS.COMPLETED ||
      allCharactersPortraitComplete(normalized))

  return normalizeGenerationProgress(progress, { isComplete })
}
