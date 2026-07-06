import { DEFAULT_ETHNICITY } from './assetsLibraryData'

export function resolveProjectDefaultEthnicity(projectDefaultEthnicity) {
  const trimmed = String(projectDefaultEthnicity ?? '').trim()
  return trimmed || DEFAULT_ETHNICITY
}

export function resolveCharacterFormEthnicity(character, projectDefaultEthnicity) {
  const saved = String(character?.ethnicity ?? '').trim()
  if (saved) return saved

  return resolveProjectDefaultEthnicity(projectDefaultEthnicity)
}

export function resolveCharacterDisplayEthnicity(character, projectDefaultEthnicity) {
  return resolveCharacterFormEthnicity(character, projectDefaultEthnicity)
}

export function isEthnicityMissing(ethnicity) {
  return !String(ethnicity ?? '').trim()
}

export function isCharacterEthnicityMissing(character) {
  return isEthnicityMissing(character?.ethnicity)
}

export async function ensureCharacterEthnicitySaved(characterId, character, projectDefaultEthnicity, updateCharacter) {
  const ethnicity = resolveCharacterFormEthnicity(character, projectDefaultEthnicity)

  const response = await updateCharacter(characterId, { ethnicity })

  return {
    ethnicity,
    response,
  }
}
