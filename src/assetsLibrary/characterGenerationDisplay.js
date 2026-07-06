import { resolveCharacterDisplayEthnicity } from './characterEthnicity'
import { characterHasHeroImage, referencesFromCharacter } from './characterReferences'
import { getCharacterImageUrl } from '../utils/resolveMediaUrl'

export const BUILD_STATUS_UI = {
  creating: {
    label: 'Creating...',
    tone: 'creating',
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

export function getBuildStatusUi(status) {
  const key = String(status ?? 'completed').toLowerCase()
  return BUILD_STATUS_UI[key] ?? BUILD_STATUS_UI.completed
}

function characterHasDownloadableReferences(character) {
  return referencesFromCharacter(character).some((ref) => {
    const url = ref.image_url ?? ref.imageUrl ?? ref.url
    return Boolean(url)
  })
}

export function buildCharacterRowModel(
  character,
  index = 0,
  projectDefaultEthnicity = null,
  buildStatus = 'completed'
) {
  const statusUi = getBuildStatusUi(buildStatus)

  return {
    id: character.id,
    name: character.name ?? 'Unnamed character',
    role: character.role ?? '',
    ethnicity: resolveCharacterDisplayEthnicity(character, projectDefaultEthnicity),
    buildStatus,
    statusLabel: statusUi.label,
    statusTone: statusUi.tone,
    heroImageUrl: getCharacterImageUrl(character),
    canDownloadHero: characterHasHeroImage(character),
    canDownloadReferences: characterHasDownloadableReferences(character),
    gradientIndex: index,
  }
}
