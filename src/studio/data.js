import { getActiveScenes } from './activeProject'
import { findShotBySelectionKey } from './shotSelection'

export const PROGRESS_STEPS = [
  { id: 'story', label: 'Story', status: 'done' },
  { id: 'screenplay', label: 'Screenplay', status: 'done' },
  { id: 'scenes', label: 'Scenes', status: 'done' },
  { id: 'shots', label: 'Shots', status: 'done' },
  { id: 'frames', label: 'Frames', status: 'done' },
  { id: 'studio', label: 'Studio', status: 'active', stepNumber: 6 },
]

export const ASSET_TOOLS = [
  { id: 'environments', label: 'Environments', color: '#22c55e' },
  { id: 'characters', label: 'Characters', color: '#a855f7' },
  { id: 'objects', label: 'Objects', color: '#06b6d4' },
  { id: 'compositions', label: 'Compositions', color: '#eab308' },
  { id: 'lighting', label: 'Lighting', color: '#f97316' },
  { id: 'shotSizes', label: 'Shot Sizes', color: '#3b82f6' },
]

export function getTotalShotCount(scenes = getActiveScenes()) {
  return scenes.reduce((sum, scene) => sum + (scene.shots?.length ?? 0), 0)
}

export const SHOT_PRESETS = {
  composition: ['Rule of Thirds', 'Center Frame', 'Leading Lines', 'Symmetry'],
  shotSize: ['Extreme Wide Shot', 'Extreme Wide', 'Wide', 'Medium', 'Close Up', 'Extreme Close Up'],
  camera: ['Static', 'Pan Left', 'Pan Right', 'Tilt Up', 'Dolly In'],
  lens: ['24mm Wide', '35mm', '50mm Standard', '85mm Portrait', '135mm Telephoto'],
  lighting: ['Natural', 'Golden Hour', 'Blue Hour', 'High Key', 'Low Key'],
  timeOfDay: ['Dawn', 'Morning', 'Afternoon', 'Sunset', 'Night'],
  mood: ['Hopeful', 'Mysterious', 'Tense', 'Serene', 'Epic'],
}

export function findShotById(shotId, scenes = getActiveScenes()) {
  const match = findShotBySelectionKey(shotId, scenes)
  if (match) return match

  for (const scene of scenes) {
    const shot = scene.shots?.find((s) => s.id === shotId)
    if (shot) {
      return { scene, shot }
    }
  }
  return null
}
