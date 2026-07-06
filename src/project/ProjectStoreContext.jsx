import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createEmptyProject } from './projectModel'
import { loadProject as loadProjectFromStorage } from './projectStorage'
import { mapApiResponseToProjectState } from '../services/api/mapApiProject'
import { getFullAdstoryProject, getProjectCharacters, getProjectEnvironments, getProjectSceneboard, getProjectStoryboard, getStoryboardScene } from '../services/adstoryApi'
import {
  guardArrayReplace,
  logProjectStore,
  mergeCharactersSafe,
  mergeEnvironmentsSafe,
} from './projectStoreHelpers'
import { normalizeCharacterList } from '../creation/characterGenerationStatus'
import { normalizeEnvironmentList } from '../creation/environmentGenerationStatus'

const ProjectStoreContext = createContext(null)

function applyProjectSnapshot(currentProject, mappedProject) {
  return {
    ...mappedProject,
    characters: mergeCharactersSafe(currentProject.characters ?? [], mappedProject.characters ?? []),
    environments: mergeEnvironmentsSafe(
      currentProject.environments ?? [],
      mappedProject.environments ?? []
    ),
  }
}

export function ProjectStoreProvider({ children, persistProject }) {
  const cached = loadProjectFromStorage()
  const [project, setProject] = useState(cached.projectId ? cached : createEmptyProject())
  const [scenes, setScenesState] = useState(cached.scenes ?? [])
  const [selectedScene, setSelectedScene] = useState(null)
  const [characters, setCharactersState] = useState(
    normalizeCharacterList(cached.characters ?? [])
  )
  const [environments, setEnvironmentsState] = useState(
    normalizeEnvironmentList(cached.environments ?? [])
  )
  const [storyboardScenes, setStoryboardScenesState] = useState([])
  const [storyboardShots, setStoryboardShotsState] = useState([])
  const [selectedShot, setSelectedShot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [generationProgress, setGenerationProgress] = useState({})

  const projectIdRef = useRef(project.projectId ?? null)
  const fullLoadedProjectIdRef = useRef(null)
  const fullLoadInFlightRef = useRef(null)
  const charactersLoadedProjectIdRef = useRef(null)
  const environmentsLoadedProjectIdRef = useRef(null)
  const scenesRef = useRef(scenes)
  const charactersRef = useRef(characters)
  const environmentsRef = useRef(environments)
  const projectRef = useRef(project)

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    charactersRef.current = characters
  }, [characters])

  useEffect(() => {
    environmentsRef.current = environments
  }, [environments])

  useEffect(() => {
    projectRef.current = project
  }, [project])

  const syncPersist = useCallback(
    (nextProject, { scenes: nextScenes, characters: nextCharacters, environments: nextEnvironments } = {}) => {
      const merged = {
        ...nextProject,
        scenes: nextScenes ?? nextProject.scenes ?? scenes,
        characters: nextCharacters ?? nextProject.characters ?? characters,
        environments: nextEnvironments ?? nextProject.environments ?? environments,
      }
      persistProject?.(merged)
      return merged
    },
    [characters, environments, persistProject, scenes]
  )

  const applyProject = useCallback(
    (
      nextProject,
      {
        scenes: nextScenes,
        characters: nextCharacters,
        environments: nextEnvironments,
        replaceSlices = false,
      } = {}
    ) => {
      const incomingScenes = nextScenes ?? nextProject.scenes ?? []
      const incomingCharacters = normalizeCharacterList(nextCharacters ?? nextProject.characters ?? [])
      const incomingEnvironments = normalizeEnvironmentList(
        nextEnvironments ?? nextProject.environments ?? []
      )

      const currentScenes = scenesRef.current
      const currentCharacters = charactersRef.current
      const currentEnvironments = environmentsRef.current

      let resolvedScenes
      let resolvedCharacters
      let resolvedEnvironments

      if (replaceSlices) {
        resolvedScenes = incomingScenes
        resolvedCharacters = incomingCharacters
        resolvedEnvironments = incomingEnvironments
      } else {
        const scenesGuarded = guardArrayReplace('scenes', currentScenes, incomingScenes)
        resolvedScenes = scenesGuarded.blocked
          ? currentScenes
          : incomingScenes.length
            ? incomingScenes
            : currentScenes

        const charactersGuarded = guardArrayReplace('characters', currentCharacters, incomingCharacters)
        resolvedCharacters = charactersGuarded.blocked
          ? currentCharacters
          : incomingCharacters.length
            ? mergeCharactersSafe(currentCharacters, incomingCharacters)
            : currentCharacters

        const environmentsGuarded = guardArrayReplace(
          'environments',
          currentEnvironments,
          incomingEnvironments
        )
        resolvedEnvironments = environmentsGuarded.blocked
          ? currentEnvironments
          : incomingEnvironments.length
            ? mergeEnvironmentsSafe(currentEnvironments, incomingEnvironments)
            : currentEnvironments

        if (!environmentsGuarded.blocked && incomingEnvironments.length) {
          console.log('[Environments] merged without touching characters/scenes')
        }
      }

      const { scenes: _s, characters: _c, environments: _e, ...projectFields } = nextProject

      setProject((currentProject) => ({
        ...currentProject,
        ...projectFields,
        projectId: projectFields.projectId ?? currentProject.projectId,
      }))
      setScenesState(resolvedScenes)
      setCharactersState(resolvedCharacters)
      setEnvironmentsState(resolvedEnvironments)

      scenesRef.current = resolvedScenes
      charactersRef.current = resolvedCharacters
      environmentsRef.current = resolvedEnvironments

      console.log('ProjectStore environments:', resolvedEnvironments.length)
      console.log('ProjectStore characters:', resolvedCharacters.length)
      console.log('ProjectStore scenes:', resolvedScenes.length)

      return syncPersist(
        {
          ...nextProject,
          scenes: resolvedScenes,
          characters: resolvedCharacters,
          environments: resolvedEnvironments,
        },
        {
          scenes: resolvedScenes,
          characters: resolvedCharacters,
          environments: resolvedEnvironments,
        }
      )
    },
    [syncPersist]
  )

  const clearProject = useCallback(() => {
    projectIdRef.current = null
    fullLoadedProjectIdRef.current = null
    fullLoadInFlightRef.current = null
    charactersLoadedProjectIdRef.current = null
    environmentsLoadedProjectIdRef.current = null
    const empty = createEmptyProject()
    setProject(empty)
    setScenesState([])
    setSelectedScene(null)
    setCharactersState([])
    setEnvironmentsState([])
    setStoryboardScenesState([])
    setStoryboardShotsState([])
    setSelectedShot(null)
    setErrors({})
    setGenerationProgress({})
    persistProject?.(empty)
  }, [persistProject])

  const loadProject = useCallback(
    async (projectId, { force = false, reason = 'enter project' } = {}) => {
      const id = projectId ?? project.projectId
      if (!id) {
        return project
      }

      if (projectIdRef.current && projectIdRef.current !== String(id)) {
        fullLoadedProjectIdRef.current = null
        charactersLoadedProjectIdRef.current = null
        environmentsLoadedProjectIdRef.current = null
        setScenesState([])
        setCharactersState([])
        setEnvironmentsState([])
        scenesRef.current = []
        charactersRef.current = []
        environmentsRef.current = []
      }

      if (!force && fullLoadedProjectIdRef.current === String(id) && fullLoadInFlightRef.current == null) {
        const cachedProject = loadProjectFromStorage()
        if (String(cachedProject.projectId) === String(id)) {
          return applyProject(cachedProject)
        }
      }

      if (fullLoadInFlightRef.current) {
        return fullLoadInFlightRef.current
      }

      setLoading(true)
      setErrors((previous) => ({ ...previous, load: null }))

      fullLoadInFlightRef.current = (async () => {
        try {
          const current = loadProjectFromStorage()
          const baseProject =
            current.projectId != null && String(current.projectId) === String(id)
              ? current
              : createEmptyProject()

          const apiProject = await getFullAdstoryProject(id)
          const mapped = mapApiResponseToProjectState(baseProject, apiProject)
          const merged = applyProjectSnapshot(
            {
              ...baseProject,
              characters: normalizeCharacterList(baseProject.characters ?? []),
              environments: normalizeEnvironmentList(baseProject.environments ?? []),
            },
            { ...mapped, projectId: id }
          )

          logProjectStore('full loaded once', reason)
          fullLoadedProjectIdRef.current = String(id)
          projectIdRef.current = String(id)
          if (merged.characters?.length) {
            charactersLoadedProjectIdRef.current = String(id)
          }
          if (merged.environments?.length) {
            environmentsLoadedProjectIdRef.current = String(id)
          }

          return applyProject(merged, { replaceSlices: true })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Failed to load project'
          setErrors((previous) => ({ ...previous, load: message }))
          throw err
        } finally {
          setLoading(false)
          fullLoadInFlightRef.current = null
        }
      })()

      return fullLoadInFlightRef.current
    },
    [applyProject, project]
  )

  const loadSceneboard = useCallback(
    async (projectId) => {
      const id = projectId ?? project.projectId
      if (!id) return []

      setLoading(true)
      try {
        const result = await getProjectSceneboard(id)
        const nextScenes = result.scenes ?? []
        const guarded = guardArrayReplace('scenes', scenes, nextScenes)
        setScenesState(guarded.value)
        syncPersist({ ...project, scenes: guarded.value }, { scenes: guarded.value })
        return guarded.value
      } finally {
        setLoading(false)
      }
    },
    [project, scenes, syncPersist]
  )

  const setScenes = useCallback(
    (nextScenes, { allowEmpty = false } = {}) => {
      const resolved = typeof nextScenes === 'function' ? nextScenes(scenes) : nextScenes
      const guarded = guardArrayReplace('scenes', scenes, resolved, { allowEmpty })
      setScenesState(guarded.value)
      syncPersist({ ...project, scenes: guarded.value }, { scenes: guarded.value })
      return guarded.value
    },
    [project, scenes, syncPersist]
  )

  const setCharacters = useCallback(
    (nextCharacters, { allowEmpty = false } = {}) => {
      const resolved =
        typeof nextCharacters === 'function' ? nextCharacters(characters) : nextCharacters
      const normalized = normalizeCharacterList(resolved)
      const guarded = guardArrayReplace('characters', characters, normalized, { allowEmpty })
      setCharactersState(guarded.value)
      syncPersist({ ...project, characters: guarded.value }, { characters: guarded.value })
      return guarded.value
    },
    [characters, project, syncPersist]
  )

  const setEnvironments = useCallback(
    (nextEnvironments, { allowEmpty = false } = {}) => {
      const resolved =
        typeof nextEnvironments === 'function' ? nextEnvironments(environments) : nextEnvironments
      const normalized = normalizeEnvironmentList(resolved)
      const guarded = guardArrayReplace('environments', environments, normalized, { allowEmpty })
      setEnvironmentsState(guarded.value)
      syncPersist({ ...project, environments: guarded.value }, { environments: guarded.value })
      return guarded.value
    },
    [environments, project, syncPersist]
  )

  const mergeCharacters = useCallback(
    (incoming = []) => {
      if (!incoming.length) return characters
      const merged = mergeCharactersSafe(characters, incoming)
      setCharactersState(merged)
      syncPersist({ ...project, characters: merged }, { characters: merged })
      return merged
    },
    [characters, project, syncPersist]
  )

  const mergeEnvironments = useCallback(
    (incoming = []) => {
      if (!incoming.length) return environmentsRef.current

      let merged = environmentsRef.current
      setEnvironmentsState((current) => {
        merged = mergeEnvironmentsSafe(current, incoming)
        syncPersist({ ...projectRef.current, environments: merged }, { environments: merged })
        environmentsRef.current = merged
        return merged
      })
      return merged
    },
    [syncPersist]
  )

  const loadCharacters = useCallback(
    async (projectId, { force = false } = {}) => {
      const id = projectId ?? project.projectId
      if (!id) return characters

      if (
        !force &&
        charactersLoadedProjectIdRef.current === String(id) &&
        characters.length > 0
      ) {
        return characters
      }

      setLoading(true)
      try {
        const fetched = normalizeCharacterList(await getProjectCharacters(id))
        if (!fetched.length) {
          return characters
        }
        const merged = mergeCharactersSafe(characters, fetched)
        logProjectStore('characters merged', { count: merged.length, source: 'GET /characters' })
        setCharactersState(merged)
        syncPersist({ ...project, characters: merged }, { characters: merged })
        charactersLoadedProjectIdRef.current = String(id)
        return merged
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load characters'
        setErrors((previous) => ({ ...previous, characters: message }))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [characters, project, syncPersist]
  )

  const loadEnvironments = useCallback(
    async (projectId, { force = false } = {}) => {
      const id = projectId ?? projectRef.current.projectId
      if (!id) return environmentsRef.current

      console.log('[Environments] loading project', id)

      const currentEnvironments = environmentsRef.current
      if (
        !force &&
        environmentsLoadedProjectIdRef.current === String(id) &&
        currentEnvironments.length > 0
      ) {
        return currentEnvironments
      }

      setLoading(true)
      try {
        const fetched = normalizeEnvironmentList(await getProjectEnvironments(id))
        console.log('[Environments] loaded', fetched.length)

        if (!fetched.length) {
          return currentEnvironments
        }

        let merged = currentEnvironments
        setEnvironmentsState((current) => {
          merged = mergeEnvironmentsSafe(current, fetched)
          console.log('[Environments] merged without touching characters/scenes')
          syncPersist({ ...projectRef.current, environments: merged }, { environments: merged })
          environmentsRef.current = merged
          return merged
        })
        environmentsLoadedProjectIdRef.current = String(id)
        return merged
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load environments'
        setErrors((previous) => ({ ...previous, environments: message }))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [syncPersist]
  )

  const refreshFullProject = useCallback(
    async (reason = 'manual refresh') => loadProject(project.projectId, { force: true, reason }),
    [loadProject, project.projectId]
  )

  const loadStoryboard = useCallback(async (projectId) => {
    const id = projectId ?? project.projectId
    if (!id) return []

    setLoading(true)
    try {
      const result = await getProjectStoryboard(id)
      const nextScenes = result.scenes ?? []
      setStoryboardScenesState(nextScenes)
      return nextScenes
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load storyboard'
      setErrors((previous) => ({ ...previous, storyboard: message }))
      throw err
    } finally {
      setLoading(false)
    }
  }, [project.projectId])

  const loadStoryboardScene = useCallback(
    async (projectId, sceneId) => {
      const id = projectId ?? project.projectId
      if (!id || sceneId == null) {
        return { scene: null, shots: [] }
      }

      setLoading(true)
      try {
        const result = await getStoryboardScene(id, sceneId)
        setSelectedScene(result.scene)
        setStoryboardShotsState(result.shots ?? [])
        setStoryboardScenesState((previous) =>
          previous.map((scene) =>
            String(scene.apiId) === String(sceneId)
              ? {
                  ...scene,
                  ...result.scene,
                  shotCount: result.shots?.length ?? scene.shotCount ?? 0,
                }
              : scene
          )
        )
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load storyboard scene'
        setErrors((previous) => ({ ...previous, storyboardScene: message }))
        throw err
      } finally {
        setLoading(false)
      }
    },
    [project.projectId]
  )

  const setStoryboardShots = useCallback((nextShots) => {
    const resolved = typeof nextShots === 'function' ? nextShots(storyboardShots) : nextShots
    setStoryboardShotsState(resolved)
    return resolved
  }, [storyboardShots])

  const updateStoryboardSceneMeta = useCallback((sceneId, patch) => {
    setStoryboardScenesState((previous) =>
      previous.map((scene) =>
        String(scene.apiId) === String(sceneId) ? { ...scene, ...patch } : scene
      )
    )
    setSelectedScene((previous) =>
      previous && String(previous.apiId) === String(sceneId) ? { ...previous, ...patch } : previous
    )
  }, [])

  const setStoryboardGenerationProgress = useCallback((progress) => {
    setGenerationProgress((previous) => ({ ...previous, storyboard: progress }))
  }, [])

  const value = useMemo(
    () => ({
      project,
      scenes,
      selectedScene,
      selectedShot,
      storyboardScenes,
      storyboardShots,
      characters,
      environments,
      loading,
      errors,
      generationProgress,
      setSelectedScene,
      setSelectedShot,
      setGenerationProgress,
      setStoryboardGenerationProgress,
      setErrors,
      loadProject,
      loadCharacters,
      loadEnvironments,
      loadSceneboard,
      loadStoryboard,
      loadStoryboardScene,
      setScenes,
      setCharacters,
      setEnvironments,
      setStoryboardShots,
      updateStoryboardSceneMeta,
      mergeCharacters,
      mergeEnvironments,
      refreshFullProject,
      clearProject,
      applyProject,
    }),
    [
      applyProject,
      characters,
      clearProject,
      environments,
      errors,
      generationProgress,
      loadProject,
      loadCharacters,
      loadEnvironments,
      loadSceneboard,
      loadStoryboard,
      loadStoryboardScene,
      loading,
      mergeCharacters,
      mergeEnvironments,
      project,
      refreshFullProject,
      scenes,
      selectedScene,
      selectedShot,
      setStoryboardGenerationProgress,
      setStoryboardShots,
      storyboardScenes,
      storyboardShots,
      updateStoryboardSceneMeta,
    ]
  )

  return <ProjectStoreContext.Provider value={value}>{children}</ProjectStoreContext.Provider>
}

export function useProjectStore() {
  const context = useContext(ProjectStoreContext)
  if (!context) {
    throw new Error('useProjectStore must be used within ProjectStoreProvider')
  }
  return context
}
