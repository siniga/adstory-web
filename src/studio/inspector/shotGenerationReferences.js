import { REFERENCE_POSES } from '../../assetsLibrary/assetsLibraryData'

const REFERENCE_TYPE_LABELS = {
  hero_portrait: 'Hero Portrait',
  ...Object.fromEntries(
    REFERENCE_POSES.map((pose) => [pose.referenceType, pose.label.split(' / ')[0].trim()])
  ),
}

export function formatReferenceTypeLabel(referenceType) {
  if (!referenceType) return 'Reference'

  const normalized = String(referenceType).trim()
  if (REFERENCE_TYPE_LABELS[normalized]) {
    return REFERENCE_TYPE_LABELS[normalized]
  }

  return normalized
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getShotGenerationMeta(shot) {
  const meta = shot?.meta && typeof shot.meta === 'object' ? shot.meta : {}

  return {
    selectedReferences: meta.selected_references ?? meta.selectedReferences ?? {},
    referenceImagesAttached:
      meta.reference_images_attached ?? meta.referenceImagesAttached ?? null,
  }
}

export function getGenerationReferenceGroups(shot) {
  const { selectedReferences } = getShotGenerationMeta(shot)

  if (!selectedReferences || typeof selectedReferences !== 'object' || Array.isArray(selectedReferences)) {
    return []
  }

  return Object.entries(selectedReferences)
    .map(([characterName, referenceTypes]) => ({
      characterName,
      referenceTypes: Array.isArray(referenceTypes)
        ? referenceTypes.map((type) => String(type).trim()).filter(Boolean)
        : [],
    }))
    .filter((group) => group.referenceTypes.length > 0)
}

export function shotHasGenerationReferences(shot) {
  const groups = getGenerationReferenceGroups(shot)
  const { referenceImagesAttached } = getShotGenerationMeta(shot)
  const attachedCount = Number(referenceImagesAttached)

  return groups.length > 0 || (Number.isFinite(attachedCount) && attachedCount > 0)
}
