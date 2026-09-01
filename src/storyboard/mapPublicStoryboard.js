import { mapAdstoryShot } from '../services/adstoryApi'

export function mapPublicStoryboard(storyboard = {}) {
  const rawShots = storyboard.shots ?? []
  const scenes = (storyboard.scenes ?? []).map((scene) => {
    const sceneShots = rawShots.filter((shot) => String(shot.scene_id) === String(scene.id))
    return {
      apiId: scene.id,
      scene_number: scene.scene_number,
      title: scene.title ?? '',
      description: scene.description ?? '',
      location: scene.location ?? '',
      time_of_day: scene.time_of_day ?? '',
      mood: scene.mood ?? '',
      shotCount: sceneShots.length,
    }
  })

  const shotsBySceneId = {}
  scenes.forEach((scene) => {
    const shots = rawShots
      .filter((shot) => String(shot.scene_id) === String(scene.apiId))
      .map((shot, index) =>
        mapAdstoryShot(shot, {
          sceneNumber: scene.scene_number,
          indexInScene: index,
        })
      )
    shotsBySceneId[scene.apiId] = shots
    shotsBySceneId[String(scene.apiId)] = shots
  })

  return {
    title: storyboard.title ?? 'Shared storyboard',
    coverImageUrl: storyboard.cover_image_url ?? null,
    scenes,
    shotsBySceneId,
  }
}
