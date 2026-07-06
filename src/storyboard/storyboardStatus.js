export function shotHasStoryboardImage(shot) {
  if (!shot) return false
  if (shot.previewImage || shot.imageUrl || shot.image_url) return true
  return shot.imageStatus === 'completed'
}

export function isStoryboardComplete(studioScenes = []) {
  const shots = studioScenes.flatMap((scene) => scene.shots ?? [])
  if (!shots.length) return false
  return shots.every(shotHasStoryboardImage)
}

export function getStoryboardShotStatus(shot) {
  return shotHasStoryboardImage(shot) ? 'done' : 'pending'
}

export function getStoryboardStatusLabel(status) {
  return status === 'done' ? 'Done' : 'Pending'
}
