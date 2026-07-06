import { findShotBySelectionKey } from './shotSelection'

let activeScenes = []
let activeProjectName = ''
let activeCharacters = []
let activeEnvironments = []
let activeObjects = []

export function resetActiveStudioProject() {
  activeScenes = []
  activeProjectName = ''
  activeCharacters = []
  activeEnvironments = []
  activeObjects = []
}

export function setActiveStudioProject({
  scenes,
  projectName,
  characters,
  environments,
  objects,
  reset = false,
} = {}) {
  if (reset) {
    resetActiveStudioProject()
    return
  }

  if (Array.isArray(scenes)) {
    activeScenes = scenes
  }

  if (projectName !== undefined) {
    activeProjectName = projectName ?? ''
  }

  if (characters !== undefined) {
    activeCharacters = Array.isArray(characters) ? characters : []
  }

  if (environments !== undefined) {
    activeEnvironments = Array.isArray(environments) ? environments : []
  }

  if (objects !== undefined) {
    activeObjects = Array.isArray(objects) ? objects : []
  }
}

export function getActiveScenes() {
  return activeScenes
}

export function getActiveProjectName() {
  return activeProjectName
}

export function getActiveCharacters() {
  return activeCharacters
}

export function getActiveEnvironments() {
  return activeEnvironments
}

export function getActiveObjects() {
  return activeObjects
}

export { findShotBySelectionKey }
