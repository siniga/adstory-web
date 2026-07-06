export function resolveAssignedCharacters(characterIds = [], projectCharacters = []) {
  const byId = new Map(projectCharacters.map((character) => [Number(character.id), character]))

  return characterIds
    .map((id) => byId.get(Number(id)))
    .filter(Boolean)
}

export function resolveAssignedEnvironment(environmentId, projectEnvironments = []) {
  if (environmentId == null) return null

  return (
    projectEnvironments.find((environment) => Number(environment.id) === Number(environmentId)) ??
    null
  )
}

export function resolveAssignedObjects(objectIds = [], projectObjects = []) {
  const byId = new Map(projectObjects.map((object) => [Number(object.id), object]))

  return objectIds
    .map((id) => byId.get(Number(id)))
    .filter(Boolean)
}

export function shotHasAssignedAssets(assignment) {
  if (!assignment) return false

  return (
    (assignment.characterIds?.length ?? 0) > 0 ||
    assignment.environmentId != null ||
    (assignment.objectIds?.length ?? 0) > 0
  )
}
