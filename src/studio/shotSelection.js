export function getShotSelectionKey(scene, shot) {
  if (shot.apiId != null && shot.apiId !== '') {
    return String(shot.apiId)
  }
  return `${scene.id}:${shot.id}`
}

export function isShotSelected(scene, shot, selectedKey) {
  if (selectedKey == null || selectedKey === '') return false
  return getShotSelectionKey(scene, shot) === String(selectedKey)
}

export function findShotBySelectionKey(selectedKey, scenes = []) {
  if (!selectedKey || !scenes.length) return null

  for (const scene of scenes) {
    for (const shot of scene.shots) {
      if (isShotSelected(scene, shot, selectedKey)) {
        return { scene, shot }
      }
    }
  }

  return null
}

export function getDefaultShotSelectionKey(scenes = []) {
  const scene = scenes[0]
  const shot = scene?.shots?.[0]
  if (!scene || !shot) return '1.1'
  return getShotSelectionKey(scene, shot)
}

export function getOrderedShotSelectionKeys(scenes = []) {
  const keys = []

  for (const scene of scenes) {
    for (const shot of scene.shots ?? []) {
      keys.push(getShotSelectionKey(scene, shot))
    }
  }

  return keys
}

export function getAdjacentShotSelectionKey(scenes, currentKey, offset) {
  const keys = getOrderedShotSelectionKeys(scenes)
  if (!keys.length) {
    return currentKey
  }

  const index = keys.findIndex((key) => key === String(currentKey))
  if (index === -1) {
    return keys[0]
  }

  const nextIndex = Math.max(0, Math.min(keys.length - 1, index + offset))
  return keys[nextIndex]
}
