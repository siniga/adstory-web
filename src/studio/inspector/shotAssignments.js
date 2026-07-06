/**
 * Per-shot asset assignments — links shots to project-level characters, environments, and objects.
 */

export function createEmptyShotAssignment() {
  return {
    characterIds: [],
    environmentId: null,
    objectIds: [],
  }
}

export function getShotAssignment(assignments, shotId) {
  return assignments[shotId] ?? createEmptyShotAssignment()
}

export function assignCharacter(assignments, shotId, characterId) {
  const current = getShotAssignment(assignments, shotId)
  if (current.characterIds.includes(characterId)) return assignments
  return {
    ...assignments,
    [shotId]: {
      ...current,
      characterIds: [...current.characterIds, characterId],
    },
  }
}

export function assignEnvironment(assignments, shotId, environmentId) {
  const current = getShotAssignment(assignments, shotId)
  return {
    ...assignments,
    [shotId]: {
      ...current,
      environmentId,
    },
  }
}

export function assignObject(assignments, shotId, objectId) {
  const current = getShotAssignment(assignments, shotId)
  if (current.objectIds.includes(objectId)) return assignments
  return {
    ...assignments,
    [shotId]: {
      ...current,
      objectIds: [...current.objectIds, objectId],
    },
  }
}
