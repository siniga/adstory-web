export const ASSET_POLL_INTERVAL_MS = 2000

export function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function replaceItemInList(items, mapped) {
  return items.map((item) => (String(item.id) === String(mapped.id) ? mapped : item))
}

export function readCharacterHeroStatus(character) {
  return String(character?.heroImageStatus ?? character?.hero_image_status ?? 'pending').toLowerCase()
}

export function readEnvironmentImageStatus(environment) {
  return String(environment?.imageStatus ?? environment?.image_status ?? 'pending').toLowerCase()
}

export function isAnyCharacterGenerating(characters = []) {
  return characters.some((character) => {
    const status = readCharacterHeroStatus(character)
    return status === 'generating' || status === 'queued' || status === 'in_progress' || status === 'processing'
  })
}

export function isAnyEnvironmentGenerating(environments = []) {
  return environments.some((environment) => {
    const status = readEnvironmentImageStatus(environment)
    return status === 'generating' || status === 'queued' || status === 'in_progress' || status === 'processing'
  })
}

export function allCharactersHeroCompleted(characters = []) {
  if (!characters.length) return false
  return characters.every((character) => readCharacterHeroStatus(character) === 'completed')
}

export function allEnvironmentImagesCompleted(environments = []) {
  if (!environments.length) return false
  return environments.every((environment) => readEnvironmentImageStatus(environment) === 'completed')
}

export function shouldStopCharacterPolling(characters = []) {
  if (!characters.length) return true
  if (isAnyCharacterGenerating(characters)) return false

  return characters.every((character) => {
    const status = readCharacterHeroStatus(character)
    return status === 'completed' || status === 'failed'
  })
}

export function shouldStopEnvironmentPolling(environments = []) {
  if (!environments.length) return true
  if (isAnyEnvironmentGenerating(environments)) return false

  return environments.every((environment) => {
    const status = readEnvironmentImageStatus(environment)
    return status === 'completed' || status === 'failed'
  })
}
