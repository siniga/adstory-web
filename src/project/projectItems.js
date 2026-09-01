export const PROJECT_OVERVIEW_ID = 'overview'

export const PROJECT_ITEM_CATALOG = [
  { id: 'story', label: 'Story' },
  { id: 'screenplay', label: 'Screenplay' },
  { id: 'sceneboard', label: 'Sequences' },
  { id: 'characters', label: 'Characters' },
  { id: 'environments', label: 'Environments' },
]

export function projectItemsPath(projectId) {
  return `/projects/${projectId}`
}

export function getAvailableProjectItems(project = {}, extras = {}) {
  const scenes = extras.scenes ?? project.scenes ?? []
  const characters = extras.characters ?? project.characters ?? []
  const environments = extras.environments ?? project.environments ?? []
  const available = {
    story: Boolean(project.story?.trim()),
    screenplay: Boolean(project.screenplay?.trim()),
    sceneboard: scenes.length > 0,
    characters: characters.length > 0,
    environments: environments.length > 0,
  }

  return PROJECT_ITEM_CATALOG.filter((item) => available[item.id])
}
