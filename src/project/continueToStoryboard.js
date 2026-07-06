import { projectHasShotAssets } from './projectModel'

export async function prepareProjectForStoryboard({
  project,
  assignAssetsToShots,
  refreshProject,
}) {
  if (!projectHasShotAssets(project)) {
    await assignAssetsToShots({ force: true })
  }

  return refreshProject()
}
