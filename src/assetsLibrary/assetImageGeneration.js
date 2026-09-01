import * as projectApi from '../services/projectApi'

export function assetNeedsPrimaryImage(item, assetType = 'character') {
  if (!item?.id) return false

  if (item.previewImage) {
    return false
  }

  if (assetType === 'character') {
    const status = item.heroImageStatus ?? 'pending'
    return status !== 'generating'
  }

  return true
}

export async function generateHeroImageForCharacter(characterId) {
  if (characterId == null || characterId === '') {
    throw new Error('Select a character before generating a hero image.')
  }

  return projectApi.generateHeroImage(characterId)
}

export async function generateCharacterReferenceForCharacter(characterId, referenceType) {
  if (characterId == null || characterId === '') {
    throw new Error('Select a character before generating a reference.')
  }

  if (!referenceType) {
    throw new Error('Reference type is required.')
  }

  return projectApi.generateCharacterReference(characterId, referenceType)
}

export async function generatePrimaryImageForAsset(item, assetType = 'character') {
  if (!item?.id) {
    throw new Error('Select an asset before generating an image.')
  }

  if (assetType === 'character') {
    return projectApi.generateHeroImage(item.id)
  }

  if (assetType === 'environment') {
    return projectApi.generateEnvironmentReferenceImage(item.id)
  }

  if (assetType === 'object') {
    return projectApi.generateObjectReferenceImage(item.id)
  }

  throw new Error('Unsupported asset type.')
}

export function getPrimaryImageActionLabel(assetType, hasImage) {
  if (assetType === 'character') {
    return hasImage ? 'Regenerate Hero Image' : 'Generate Hero Image'
  }

  return hasImage ? 'Regenerate Reference Image' : 'Generate Reference Image'
}

export function getPrimaryImageGeneratingLabel(assetType) {
  if (assetType === 'character') {
    return 'Generating hero + basic references...'
  }

  return 'Generating…'
}

export function getGenerateAllLabel(assetType) {
  if (assetType === 'character') {
    return 'Generate All Hero Images'
  }

  return 'Generate All References'
}
