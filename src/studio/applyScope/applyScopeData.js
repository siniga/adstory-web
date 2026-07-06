import { getActiveScenes } from '../activeProject'
import { findShotById } from '../data'

export const SCOPE_OPTIONS = [
  { id: 'currentShot', label: 'Current Shot' },
  { id: 'currentScene', label: 'Current Scene' },
  { id: 'selectedScenes', label: 'Selected Scenes' },
  { id: 'entireProject', label: 'Entire Project' },
]

export function getProjectScenes() {
  return getActiveScenes().map((scene) => ({
    id: scene.id,
    label: `Scene ${scene.id} — ${scene.title}`,
  }))
}

export const CONSISTENCY_WARNINGS = [
  'This may change character appearance in approved shots.',
  'Some shots may need regeneration.',
  'Lighting differences may affect consistency.',
]

export const DEFAULT_IMPACT = {
  characters: 1,
  scenes: 3,
  shots: 8,
  frames: 24,
}

export function getShotContext(shotId) {
  const match = findShotById(shotId)
  return {
    shotId: match?.shot?.id ?? shotId ?? null,
    sceneId: match?.scene?.id ?? null,
    sceneTitle: match?.scene?.title ?? '',
  }
}

export function getScopeDetail(scopeId, context) {
  switch (scopeId) {
    case 'currentShot':
      return `Only update Shot ${context.shotId}`
    case 'currentScene':
      return `Update all shots in Scene ${context.sceneId}`
    case 'selectedScenes':
      return 'Choose specific scenes'
    case 'entireProject':
      return 'Update every shot where this asset appears'
    default:
      return ''
  }
}

export function getImpactForScope(scopeId, selectedSceneIds = []) {
  switch (scopeId) {
    case 'currentShot':
      return { characters: 1, scenes: 1, shots: 1, frames: 3 }
    case 'currentScene':
      return { characters: 1, scenes: 1, shots: 3, frames: 9 }
    case 'selectedScenes': {
      const count = Math.max(selectedSceneIds.length, 1)
      return { characters: 1, scenes: count, shots: count * 2, frames: count * 6 }
    }
    case 'entireProject':
      return DEFAULT_IMPACT
    default:
      return DEFAULT_IMPACT
  }
}
