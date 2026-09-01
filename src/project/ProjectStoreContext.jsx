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
import * as projectApi from '../services/projectApi'
import { getProjectCharacters, getProjectEnvironments, getProjectSceneboard, getProjectStoryboard, getStoryboardScene, mapAdstoryCharacters, mapAdstoryEnvironments, mapAdstoryScenes, mapAdstoryShot } from '../services/adstoryApi'
import {
  guardArrayReplace,
  logProjectStore,
  mergeCharactersSafe,
  mergeEnvironmentsSafe,
} from './projectStoreHelpers'
import { normalizeCharacterList } from '../creation/characterGenerationStatus'
import { normalizeEnvironmentList } from '../creation/environmentGenerationStatus'
import { syncStoryboardGeneratedFromProject, syncStoryboardGeneratedFromScenes } from '../storyboard/storyboardStale'

const ProjectStoreContext = createContext(null)

function mapLaravelStoryboardScenes(scenes = [], shots = []) {
  return scenes.map((scene) => {
    const sceneShots = shots.filter((shot) => String(shot.scene_id) === String(scene.id))
    return {
      apiId: scene.id,
      scene_number: scene.scene_number,
      title: scene.title ?? '',
      description: scene.description ?? '',
      location: scene.location ?? '',
      time_of_day: scene.time_of_day ?? '',
      mood: scene.mood ?? '',
      shotCount: sceneShots.length,
      shotGenerationStatus: sceneShots.length ? 'completed' : 'not_started',
      shotGenerationError: null,
      status: scene.status ?? null,
    }
  })
}

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
  const loadEpochRef = useRef(0)
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
        scenes: nextScenes ?? nextProject.scenes ?? scenesRef.current,
        characters: nextCharacters ?? nextProject.characters ?? charactersRef.current,
        environments: nextEnvironments ?? nextProject.environments ?? environmentsRef.current,
      }
      persistProject?.(merged)
      return merged
    },
    [persistProject]
  )

  const applyProject = useCallback(
    (
      nextProject,
      {
        scenes: nextScenes,
        characters: nextCharacters,
        environments: nextEnvironments,
        replaceSlices = false,
        slice = null,
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

      let resolvedScenes = currentScenes
      let resolvedCharacters = currentCharacters
      let resolvedEnvironments = currentEnvironments

      if (slice === 'scenes') {
        resolvedScenes = incomingScenes
      } else if (slice === 'characters') {
        resolvedCharacters = incomingCharacters
      } else if (slice === 'environments') {
        resolvedEnvironments = incomingEnvironments
      } else if (replaceSlices) {
        resolvedScenes = incomingScenes.length ? incomingScenes : currentScenes
        resolvedCharacters = incomingCharacters.length ? incomingCharacters : currentCharacters
        resolvedEnvironments = incomingEnvironments.length ? incomingEnvironments : currentEnvironments
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
        projectId:
          projectFields.projectId !== undefined
            ? projectFields.projectId
            : currentProject.projectId,
      }))

      if (slice === null || slice === 'scenes') {
        setScenesState(resolvedScenes)
        scenesRef.current = resolvedScenes
      }
      if (slice === null || slice === 'characters') {
        setCharactersState(resolvedCharacters)
        charactersRef.current = resolvedCharacters
      }
      if (slice === null || slice === 'environments') {
        setEnvironmentsState(resolvedEnvironments)
        environmentsRef.current = resolvedEnvironments
      }

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
    loadEpochRef.current += 1
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
    scenesRef.current = []
    charactersRef.current = []
    environmentsRef.current = []
    projectRef.current = empty
    persistProject?.(empty)
  }, [persistProject])

  const loadProject = useCallback(
    async (projectId, { force = false, reason = 'enter project', slice = null } = {}) => {
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

      if (!force && !slice && fullLoadedProjectIdRef.current === String(id) && fullLoadInFlightRef.current == null) {
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

      const epoch = loadEpochRef.current
      fullLoadInFlightRef.current = (async () => {
        try {
          const current = loadProjectFromStorage()
          const baseProject =
            current.projectId != null && String(current.projectId) === String(id)
              ? current
              : createEmptyProject()

          const apiProject = await projectApi.getProject(id)
          if (epoch !== loadEpochRef.current) {
            return projectRef.current
          }
          let enrichedApiProject = apiProject

          if (slice === 'characters') {
            const fetchedCharacters = normalizeCharacterList(await getProjectCharacters(id))
            if (epoch !== loadEpochRef.current) {
              return projectRef.current
            }
            if (fetchedCharacters.length) {
              enrichedApiProject = { ...enrichedApiProject, characters: fetchedCharacters }
            }
          }

          if (slice === 'environments') {
            const fetchedEnvironments = normalizeEnvironmentList(await getProjectEnvironments(id))
            if (epoch !== loadEpochRef.current) {
              return projectRef.current
            }
            if (fetchedEnvironments.length) {
              enrichedApiProject = { ...enrichedApiProject, environments: fetchedEnvironments }
            }
          }

          const mapped = mapApiResponseToProjectState(baseProject, enrichedApiProject)
          const merged = applyProjectSnapshot(
            {
              ...baseProject,
              characters: normalizeCharacterList(baseProject.characters ?? []),
              environments: normalizeEnvironmentList(baseProject.environments ?? []),
            },
            { ...mapped, projectId: id }
          )

          if (epoch !== loadEpochRef.current) {
            return projectRef.current
          }

          logProjectStore(`full loaded once (slice: ${slice || 'all'})`, reason)
          if (!slice) {
            fullLoadedProjectIdRef.current = String(id)
          }
          projectIdRef.current = String(id)
          if (merged.characters?.length && (slice === 'characters' || !slice)) {
            charactersLoadedProjectIdRef.current = String(id)
          }
          if (merged.environments?.length && (slice === 'environments' || !slice)) {
            environmentsLoadedProjectIdRef.current = String(id)
          }

          syncStoryboardGeneratedFromProject(id, merged)
          return applyProject(merged, { replaceSlices: true, slice })
        } catch (err) {
          if (epoch !== loadEpochRef.current) {
            return projectRef.current
          }
          const message = err instanceof Error ? err.message : 'Failed to load project'
          setErrors((previous) => ({ ...previous, load: message }))
          throw err
        } finally {
          if (epoch === loadEpochRef.current) {
            setLoading(false)
            fullLoadInFlightRef.current = null
          }
        }
      })()

      return fullLoadInFlightRef.current
    },
    [applyProject, project]
  )

  const sceneboardInflightRef = useRef(new Map())

  const loadSceneboard = useCallback(
    async (projectId, { silent = false } = {}) => {
      const id = projectId ?? projectRef.current.projectId
      if (!id) return []

      const key = String(id)
      const existing = sceneboardInflightRef.current.get(key)
      if (existing) {
        return existing
      }

      const request = (async () => {
        if (!silent) {
          setLoading(true)
        }
        try {
          let nextScenes = []
          try {
            const liveProject = await projectApi.getProject(id)
            nextScenes = mapAdstoryScenes(liveProject.scenes ?? [])
          } catch {
            nextScenes = []
          }

          if (nextScenes.length === 0) {
            const result = await getProjectSceneboard(id)
            nextScenes = result.scenes ?? []
          }
          const guarded = guardArrayReplace('scenes', scenesRef.current, nextScenes)
          setScenesState(guarded.value)
          syncPersist(
            { ...projectRef.current, scenes: guarded.value },
            { scenes: guarded.value }
          )
          return guarded.value
        } finally {
          sceneboardInflightRef.current.delete(key)
          if (!silent) {
            setLoading(false)
          }
        }
      })()

      sceneboardInflightRef.current.set(key, request)
      return request
    },
    [syncPersist]
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
        let fetched = []
        let liveLoaded = false
        try {
          const liveProject = await projectApi.getProject(id)
          fetched = normalizeCharacterList(mapAdstoryCharacters(liveProject.characters ?? []))
          liveLoaded = true
        } catch {
          fetched = []
        }

        if (!liveLoaded) {
          fetched = normalizeCharacterList(await getProjectCharacters(id))
        }

        setCharactersState(fetched)
        syncPersist({ ...project, characters: fetched }, { characters: fetched })
        charactersLoadedProjectIdRef.current = String(id)
        return fetched
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
        let fetched = []
        let liveLoaded = false
        try {
          const liveProject = await projectApi.getProject(id)
          fetched = normalizeEnvironmentList(mapAdstoryEnvironments(liveProject.environments ?? []))
          liveLoaded = true
        } catch {
          fetched = []
        }

        if (!liveLoaded) {
          fetched = normalizeEnvironmentList(await getProjectEnvironments(id))
        }

        console.log('[Environments] loaded', fetched.length)

        setEnvironmentsState(fetched)
        environmentsRef.current = fetched
        syncPersist({ ...projectRef.current, environments: fetched }, { environments: fetched })
        environmentsLoadedProjectIdRef.current = String(id)
        return fetched
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
    async (reason = 'manual refresh', { slice = null } = {}) => loadProject(project.projectId, { force: true, reason, slice }),
    [loadProject, project.projectId]
  )

  const loadStoryboard = useCallback(async (projectId) => {
    const id = projectId ?? project.projectId
    if (!id) return []

    setLoading(true)
    try {
      let nextScenes = []
      try {
        const liveProject = await projectApi.getProject(id)
        const shots = liveProject.shots ?? []
        if ((liveProject.scenes?.length ?? 0) > 0 && shots.length > 0) {
          nextScenes = mapLaravelStoryboardScenes(liveProject.scenes, shots)
        }
      } catch {
        nextScenes = []
      }

      if (nextScenes.length === 0) {
        const result = await getProjectStoryboard(id)
        nextScenes = result.scenes ?? []
      }

      syncStoryboardGeneratedFromScenes(id, nextScenes)
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
        let result = null
        try {
          const liveProject = await projectApi.getProject(id)
          const shots = liveProject.shots ?? []
          const scene = (liveProject.scenes ?? []).find(
            (item) => String(item.id) === String(sceneId)
          )
          if (scene && shots.length > 0) {
            const sceneShots = shots.filter((shot) => String(shot.scene_id) === String(sceneId))
            result = {
              scene: {
                apiId: scene.id,
                scene_number: scene.scene_number,
                title: scene.title ?? '',
                description: scene.description ?? '',
                location: scene.location ?? '',
                time_of_day: scene.time_of_day ?? '',
                mood: scene.mood ?? '',
                shotCount: sceneShots.length,
                shotGenerationStatus: sceneShots.length ? 'completed' : 'not_started',
                status: scene.status ?? null,
              },
              shots: sceneShots.map((shot, index) =>
                mapAdstoryShot(shot, {
                  sceneNumber: scene.scene_number,
                  indexInScene: index,
                })
              ),
              characters: liveProject.characters ?? [],
              environments: liveProject.environments ?? [],
            }
          }
        } catch {
          result = null
        }

        if (!result) {
          result = await getStoryboardScene(id, sceneId)
        }

        setSelectedScene(result.scene)
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
    let resolved = nextShots
    setStoryboardShotsState((previous) => {
      resolved = typeof nextShots === 'function' ? nextShots(previous) : nextShots
      return resolved
    })
    return resolved
  }, [])

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
