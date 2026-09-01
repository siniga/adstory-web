export const CHARACTER_IMAGE_BATCH = 6

export function characterHasPortrait(character) {
  const url =
    character?.image_url ??
    character?.imageUrl ??
    character?.heroImageUrl ??
    character?.hero_image_url ??
    ''
  return Boolean(String(url).trim())
}

export function shotHasImage(shot) {
  const url = shot?.image_url ?? shot?.imageUrl ?? ''
  if (String(url).trim()) return true

  const images = shot?.shot_images ?? shot?.images ?? []
  return images.some(
    (image) => image.status === 'completed' && (image.image_url || image.thumbnail_url)
  )
}

export function hasAnyShotImage(shots = []) {
  return shots.some(shotHasImage)
}

export function charactersMissingPortraits(characters = []) {
  return characters.filter((character) => !characterHasPortrait(character))
}

export function characterHasCostume(character) {
  const url = character?.costume_image_url ?? ''
  if (String(url).trim()) return true

  const assets = character?.assets ?? []
  return assets.some(
    (asset) => asset?.asset_type === 'costume' && String(asset?.image_url ?? '').trim()
  )
}

export function charactersMissingCostumes(characters = []) {
  return characters.filter(
    (character) => characterHasPortrait(character) && !characterHasCostume(character)
  )
}

export function environmentHasImage(environment) {
  const url = environment?.image_url ?? environment?.imageUrl ?? ''
  if (String(url).trim()) return true

  const assets = environment?.assets ?? []
  return assets.some((asset) => String(asset?.image_url ?? '').trim())
}

export function environmentsMissingImages(environments = []) {
  return environments.filter((environment) => !environmentHasImage(environment))
}

export function sceneKey(scene) {
  const key = scene?.apiId ?? scene?.id
  return key == null ? null : String(key)
}

export function shotsForScene(scene, shotsBySceneId = {}) {
  const key = sceneKey(scene)
  if (key == null) return []
  return shotsBySceneId[key] ?? shotsBySceneId[Number(key)] ?? []
}

export function nextSceneNeedingImages(scenes = [], shotsBySceneId = {}, excludeSceneId = null) {
  const skip = excludeSceneId == null ? null : String(excludeSceneId)
  return (
    scenes.find((scene) => {
      if (skip != null && sceneKey(scene) === skip) return false
      const shots = shotsForScene(scene, shotsBySceneId)
      return shots.length > 0 && shots.some((shot) => !shotHasImage(shot))
    }) ?? null
  )
}

export function groupShotsByScene(scenes = [], shots = []) {
  const next = {}
  for (const scene of scenes) {
    const sceneId = scene.apiId ?? scene.id
    if (sceneId == null) continue
    const sceneShots = shots.filter(
      (shot) => String(shot.scene_id ?? shot.sceneApiId) === String(sceneId)
    )
    next[sceneId] = sceneShots
    next[String(sceneId)] = sceneShots
  }
  return next
}
