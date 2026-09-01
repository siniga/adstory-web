import { getShotDisplayImageUrl } from '../utils/resolveMediaUrl'

export function sortShots(shots = []) {
  return [...shots].sort(
    (a, b) =>
      (a.order_index ?? 0) - (b.order_index ?? 0) ||
      String(a.shot_number ?? '').localeCompare(String(b.shot_number ?? ''), undefined, {
        numeric: true,
      })
  )
}

export function shotRecordKey(shot) {
  if (!shot) return ''
  return String(shot.apiId ?? shot.id ?? '')
}

export function sceneRecordKey(scene) {
  if (!scene) return ''
  return String(scene.apiId ?? scene.id ?? '')
}

export function sceneDisplayLabel(scene) {
  if (!scene) return 'Scene'
  const number = scene.scene_number != null ? `Scene ${scene.scene_number}` : 'Scene'
  return scene.title ? `${number} — ${scene.title}` : number
}

export function shotDisplayTitle(shot, index = 0) {
  const number = shot?.shot_number ?? index + 1
  return shot?.title?.trim() || `Shot ${number}`
}

export function collectShotLightboxItems(
  scenes = [],
  shotsBySceneId = {},
  fallbackShots = [],
  fallbackSceneId = null
) {
  const items = []

  scenes.forEach((scene) => {
    const key = sceneRecordKey(scene)
    let shots = sortShots(shotsBySceneId[key] ?? shotsBySceneId[String(key)] ?? [])
    if (
      !shots.length &&
      fallbackSceneId != null &&
      String(key) === String(fallbackSceneId)
    ) {
      shots = sortShots(fallbackShots)
    }
    shots.forEach((shot, index) => {
      items.push(makeLightboxItem(shot, scene, index))
    })
  })

  if (items.length === 0 && fallbackShots.length) {
    sortShots(fallbackShots).forEach((shot, index) => {
      items.push(makeLightboxItem(shot, null, index))
    })
  }

  return items
}

export function makeLightboxItem(shot, scene = null, index = 0) {
  return {
    key: shotRecordKey(shot) || `${sceneRecordKey(scene)}-${index}`,
    shot,
    scene,
    imageUrl: getShotDisplayImageUrl(shot),
    title: shotDisplayTitle(shot, index),
    sceneLabel: sceneDisplayLabel(scene),
  }
}

export function findLightboxIndex(items, shot) {
  const key = shotRecordKey(shot)
  if (!key) return 0
  const index = items.findIndex((item) => item.key === key)
  return index >= 0 ? index : 0
}
