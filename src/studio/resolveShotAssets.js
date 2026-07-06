import { getShotAssignment } from './inspector/shotAssignments'
import {
  resolveAssignedCharacters,
  resolveAssignedEnvironment,
  resolveAssignedObjects,
} from './inspector/resolveShotAssignmentAssets'

export function hasEnrichedShotAssets(shot) {
  if (!shot) return false

  return 'characters' in shot || 'environment' in shot || 'objects' in shot
}

export function resolveShotCharacters(shot, shotAssignments, projectCharacters) {
  if (hasEnrichedShotAssets(shot) && Array.isArray(shot.characters)) {
    return shot.characters
  }

  const assignment = getShotAssignment(shotAssignments, shot?.id)
  return resolveAssignedCharacters(assignment.characterIds, projectCharacters)
}

export function resolveShotEnvironment(shot, shotAssignments, projectEnvironments) {
  if (hasEnrichedShotAssets(shot) && 'environment' in shot) {
    return shot.environment ?? null
  }

  const assignment = getShotAssignment(shotAssignments, shot?.id)
  return resolveAssignedEnvironment(assignment.environmentId, projectEnvironments)
}

export function resolveShotObjects(shot, shotAssignments, projectObjects) {
  if (hasEnrichedShotAssets(shot) && Array.isArray(shot.objects)) {
    return shot.objects
  }

  const assignment = getShotAssignment(shotAssignments, shot?.id)
  return resolveAssignedObjects(assignment.objectIds, projectObjects)
}

export function getShotAssetCounts(shot, shotAssignments = {}) {
  if (hasEnrichedShotAssets(shot)) {
    return {
      characters: shot.characters?.length ?? 0,
      environments: shot.environment ? 1 : 0,
      objects: shot.objects?.length ?? 0,
    }
  }

  const assignment = getShotAssignment(shotAssignments, shot?.id)
  return {
    characters: assignment.characterIds.length,
    environments: assignment.environmentId ? 1 : 0,
    objects: assignment.objectIds.length,
  }
}

export function shotHasAssignedAssets(shot, shotAssignments) {
  if (hasEnrichedShotAssets(shot)) {
    return (
      (shot.characters?.length ?? 0) > 0 ||
      shot.environment != null ||
      (shot.objects?.length ?? 0) > 0
    )
  }

  const assignment = getShotAssignment(shotAssignments, shot?.id)
  return (
    (assignment.characterIds?.length ?? 0) > 0 ||
    assignment.environmentId != null ||
    (assignment.objectIds?.length ?? 0) > 0
  )
}
