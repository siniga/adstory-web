import { getSceneImageStatus, SCENE_IMAGE_STATUS } from '../studio/imageStatus'

export function getFirstStudioScene(project) {
  return project?.studioScenes?.[0] ?? null
}

export function getFirstSceneApiIdFromProject(project) {
  const studioScene = getFirstStudioScene(project)
  if (studioScene?.apiId) {
    return studioScene.apiId
  }

  return project?.scenes?.[0]?.apiId ?? null
}

export function firstSceneHasCompletedImages(project) {
  const scene = getFirstStudioScene(project)
  if (!scene?.shots?.length) {
    return false
  }

  return getSceneImageStatus(scene) === SCENE_IMAGE_STATUS.COMPLETE
}
