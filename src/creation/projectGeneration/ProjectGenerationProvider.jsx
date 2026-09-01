import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  cancelCharacterGeneration,
  cancelEnvironmentGeneration,
  cancelSceneGeneration,
  getCharacterGenerationProgress,
  getEnvironmentGenerationProgress,
  getSceneGenerationProgress,
  mapAdstoryCharacters,
  mapAdstoryEnvironments,
  resumeCharacterGeneration,
  resumeEnvironmentGeneration,
  resumeSceneGeneration,
} from '../../services/adstoryApi'
import {
  createGenerationStuckTracker,
  evaluateGenerationStuck,
  isGenerationInProgress,
  isGenerationTerminal,
  PROJECT_GEN_STATUS,
  resetGenerationStuckTracker,
} from '../aiGenerationStatus'
import {
  logCharactersUpdate,
  mergeCharacterListsPreservingPortraits,
  mergeCharacterProgressWithList,
  normalizeCharacterGenerationProgress,
  normalizeCharacterList,
} from '../characterGenerationStatus'
import {
  mergeEnvironmentListsPreservingImages,
  normalizeEnvironmentGenerationProgress,
  normalizeEnvironmentList,
} from '../environmentGenerationStatus'
import { patchSceneboardScenesFromProgress } from '../sceneboardStatus'
import { normalizeSceneGenerationProgress } from '../sceneGenerationStatus'
import {
  buildCharacterMeta,
  buildEnvironmentMeta,
  buildSceneMeta,
  GENERATION_TYPES,
  shouldPollCharacters,
  shouldPollEnvironments,
  shouldPollScenes,
} from './generationPollHelpers'

export { GENERATION_TYPES }

const POLL_INTERVAL_MS = 2000

const ProjectGenerationContext = createContext(null)

const PROGRESS_FETCHERS = {
  [GENERATION_TYPES.SCENES]: getSceneGenerationProgress,
  [GENERATION_TYPES.CHARACTERS]: getCharacterGenerationProgress,
  [GENERATION_TYPES.ENVIRONMENTS]: getEnvironmentGenerationProgress,
}

const CANCEL_HANDLERS = {
  [GENERATION_TYPES.SCENES]: cancelSceneGeneration,
  [GENERATION_TYPES.CHARACTERS]: cancelCharacterGeneration,
  [GENERATION_TYPES.ENVIRONMENTS]: cancelEnvironmentGeneration,
}

function createEmptySlices() {
  return {
    [GENERATION_TYPES.SCENES]: {
      progress: null,
      isStuck: false,
      resuming: false,
      cancelling: false,
    },
    [GENERATION_TYPES.CHARACTERS]: {
      progress: null,
      isStuck: false,
      resuming: false,
      cancelling: false,
    },
    [GENERATION_TYPES.ENVIRONMENTS]: {
      progress: null,
      isStuck: false,
      resuming: false,
      cancelling: false,
    },
  }
}

export function ProjectGenerationProvider({
  children,
  projectId,
  project = {},
  scenes = [],
  characters = [],
  environments = [],
  setScenes,
  mergeCharacters,
  mergeEnvironments,
  onSceneMetaChange,
  onCharacterMetaChange,
  onEnvironmentMetaChange,
}) {
  const [sliceState, setSliceState] = useState(createEmptySlices)
  const [monitoring, setMonitoring] = useState(false)

  const projectRef = useRef(project)
  const scenesRef = useRef(scenes)
  const charactersRef = useRef(characters)
  const environmentsRef = useRef(environments)
  const progressRef = useRef({
    scenes: null,
    characters: null,
    environments: null,
  })
  const userPausedRef = useRef({
    scenes: false,
    characters: false,
    environments: false,
  })
  const stuckTrackersRef = useRef({
    scenes: createGenerationStuckTracker(),
    characters: createGenerationStuckTracker(),
    environments: createGenerationStuckTracker(),
  })
  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const visualStyleRef = useRef(project.visualStyle ?? '')

  useEffect(() => {
    projectRef.current = project
    visualStyleRef.current = project.visualStyle ?? ''
  }, [project])

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
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [])

  const updateSlice = useCallback((type, patch) => {
    setSliceState((previous) => ({
      ...previous,
      [type]: {
        ...previous[type],
        ...patch,
      },
    }))
  }, [])

  const applySceneProgress = useCallback(
    (rawProgress) => {
      if (!rawProgress) return

      const loadedScenes = rawProgress.scenes?.length
        ? patchSceneboardScenesFromProgress(scenesRef.current, rawProgress.scenes)
        : scenesRef.current

      if (rawProgress.scenes?.length) {
        setScenes?.(loadedScenes)
      }

      const normalized = normalizeSceneGenerationProgress(rawProgress, loadedScenes)
      progressRef.current.scenes = normalized
      updateSlice(GENERATION_TYPES.SCENES, {
        progress: normalized,
        isStuck: evaluateGenerationStuck(normalized, stuckTrackersRef.current.scenes),
      })
      onSceneMetaChange?.(buildSceneMeta(normalized, projectRef.current))
    },
    [onSceneMetaChange, setScenes, updateSlice]
  )

  const applyCharacterProgress = useCallback(
    (rawProgress) => {
      if (!rawProgress) return

      let loadedCharacters = charactersRef.current
      if (rawProgress.characters?.length) {
        const mapped = mapAdstoryCharacters(rawProgress.characters)
        loadedCharacters = mergeCharacterListsPreservingPortraits(charactersRef.current, mapped)
        logCharactersUpdate('ProjectGenerationProvider characters/progress', loadedCharacters)
        mergeCharacters?.(loadedCharacters)
      }

      const merged = mergeCharacterProgressWithList(rawProgress, loadedCharacters)
      const normalized = normalizeCharacterGenerationProgress(merged, loadedCharacters)
      progressRef.current.characters = normalized
      updateSlice(GENERATION_TYPES.CHARACTERS, {
        progress: normalized,
        isStuck: evaluateGenerationStuck(normalized, stuckTrackersRef.current.characters),
      })
      onCharacterMetaChange?.(buildCharacterMeta(normalized, projectRef.current))
    },
    [mergeCharacters, onCharacterMetaChange, updateSlice]
  )

  const applyEnvironmentProgress = useCallback(
    (rawProgress) => {
      if (!rawProgress) return

      let loadedEnvironments = environmentsRef.current
      if (rawProgress.environments?.length) {
        const mapped = mapAdstoryEnvironments(rawProgress.environments)
        loadedEnvironments = mergeEnvironmentListsPreservingImages(
          environmentsRef.current,
          mapped
        )
        mergeEnvironments?.(loadedEnvironments)
      }

      const normalized = normalizeEnvironmentGenerationProgress(rawProgress, loadedEnvironments)
      progressRef.current.environments = normalized
      updateSlice(GENERATION_TYPES.ENVIRONMENTS, {
        progress: normalized,
        isStuck: evaluateGenerationStuck(normalized, stuckTrackersRef.current.environments),
      })
      onEnvironmentMetaChange?.(buildEnvironmentMeta(normalized, projectRef.current))
    },
    [mergeEnvironments, onEnvironmentMetaChange, updateSlice]
  )

  const applyHandlers = useRef({
    [GENERATION_TYPES.SCENES]: applySceneProgress,
    [GENERATION_TYPES.CHARACTERS]: applyCharacterProgress,
    [GENERATION_TYPES.ENVIRONMENTS]: applyEnvironmentProgress,
  })

  useEffect(() => {
    applyHandlers.current = {
      [GENERATION_TYPES.SCENES]: applySceneProgress,
      [GENERATION_TYPES.CHARACTERS]: applyCharacterProgress,
      [GENERATION_TYPES.ENVIRONMENTS]: applyEnvironmentProgress,
    }
  }, [applyCharacterProgress, applyEnvironmentProgress, applySceneProgress])

  const pollType = useCallback(
    async (type) => {
      if (!projectId || !mountedRef.current) return

      const fetcher = PROGRESS_FETCHERS[type]
      if (!fetcher) return

      try {
        const raw = await fetcher(projectId)
        if (!mountedRef.current) return
        applyHandlers.current[type]?.(raw)
      } catch {
        // Keep polling — transient network errors should not kill the coordinator.
      }
    },
    [projectId]
  )

  const getPollState = useCallback(
    () => ({
      progress: progressRef.current,
      scenes: scenesRef.current,
      characters: charactersRef.current,
      environments: environmentsRef.current,
      project: projectRef.current,
      userPaused: userPausedRef.current,
    }),
    []
  )

  const getActivePollTypes = useCallback(() => {
    const state = getPollState()
    const active = []

    if (
      shouldPollScenes({
        progress: state.progress.scenes,
        scenes: state.scenes,
        project: state.project,
        userPaused: state.userPaused.scenes,
      })
    ) {
      active.push(GENERATION_TYPES.SCENES)
    }

    if (
      shouldPollCharacters({
        progress: state.progress.characters,
        characters: state.characters,
        project: state.project,
        userPaused: state.userPaused.characters,
      })
    ) {
      active.push(GENERATION_TYPES.CHARACTERS)
    }

    if (
      shouldPollEnvironments({
        progress: state.progress.environments,
        environments: state.environments,
        project: state.project,
        userPaused: state.userPaused.environments,
      })
    ) {
      active.push(GENERATION_TYPES.ENVIRONMENTS)
    }

    return active
  }, [getPollState])

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current || !projectId) return

    pollTimerRef.current = setTimeout(async () => {
      pollTimerRef.current = null
      if (!mountedRef.current) return

      const activeTypes = getActivePollTypes()
      if (!activeTypes.length) {
        setMonitoring(false)
        return
      }

      setMonitoring(true)
      await Promise.all(activeTypes.map((type) => pollType(type)))

      if (mountedRef.current && getActivePollTypes().length > 0) {
        schedulePoll()
      } else if (mountedRef.current) {
        setMonitoring(false)
      }
    }, POLL_INTERVAL_MS)
  }, [getActivePollTypes, pollType, projectId])

  const refreshAll = useCallback(async () => {
    if (!projectId) return

    // Check live work first; only hit endpoints that need monitoring.
    const activeBefore = getActivePollTypes()
    const typesToPoll =
      activeBefore.length > 0
        ? activeBefore
        : [
            // One-shot discovery for each stream when nothing looks active yet.
            GENERATION_TYPES.SCENES,
            GENERATION_TYPES.CHARACTERS,
            GENERATION_TYPES.ENVIRONMENTS,
          ]

    await Promise.all(typesToPoll.map((type) => pollType(type)))
    if (getActivePollTypes().length > 0) {
      setMonitoring(true)
      schedulePoll()
    } else {
      setMonitoring(false)
    }
  }, [getActivePollTypes, pollType, projectId, schedulePoll])

  const refreshType = useCallback(
    async (type) => {
      userPausedRef.current[type] = false
      await pollType(type)
      if (getActivePollTypes().length > 0) {
        setMonitoring(true)
        schedulePoll()
      }
    },
    [getActivePollTypes, pollType, schedulePoll]
  )

  useEffect(() => {
    if (!projectId) return undefined

    userPausedRef.current = {
      scenes: false,
      characters: false,
      environments: false,
    }
    progressRef.current = { scenes: null, characters: null, environments: null }
    setSliceState(createEmptySlices())
    Object.values(stuckTrackersRef.current).forEach((tracker) =>
      resetGenerationStuckTracker(tracker)
    )

    let cancelled = false

    ;(async () => {
      await refreshAll()
      if (!cancelled && mountedRef.current && getActivePollTypes().length > 0) {
        setMonitoring(true)
        schedulePoll()
      }
    })()

    return () => {
      cancelled = true
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }
    }
  }, [getActivePollTypes, projectId, refreshAll, schedulePoll])

  useEffect(() => {
    if (!projectId) return
    // Only (re)start polling when there is live work — do not key off scene/character
    // array identity, which changes often and used to restart timers endlessly.
    if (getActivePollTypes().length > 0 && !pollTimerRef.current) {
      setMonitoring(true)
      schedulePoll()
    }
  }, [
    getActivePollTypes,
    project?.characterGenerationStatus,
    project?.environmentGenerationStatus,
    project?.sceneGenerationStatus,
    projectId,
    schedulePoll,
  ])

  const handleCancel = useCallback(
    async (type) => {
      if (!projectId) return

      userPausedRef.current[type] = true
      updateSlice(type, { cancelling: true })

      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
        pollTimerRef.current = null
      }

      try {
        const raw = await CANCEL_HANDLERS[type](projectId)
        applyHandlers.current[type]?.(raw?.progress ?? raw)
      } finally {
        if (mountedRef.current) {
          updateSlice(type, { cancelling: false })
          setMonitoring(false)
        }
      }
    },
    [projectId, updateSlice]
  )

  const handleResume = useCallback(
    async (type, { retry_failed = false, style } = {}) => {
      if (!projectId) return

      userPausedRef.current[type] = false
      updateSlice(type, { resuming: true })
      resetGenerationStuckTracker(stuckTrackersRef.current[type])

      const resumeHandlers = {
        [GENERATION_TYPES.SCENES]: () => resumeSceneGeneration(projectId, { retry_failed }),
        [GENERATION_TYPES.CHARACTERS]: () =>
          resumeCharacterGeneration(projectId, {
            retry_failed,
            style: style ?? visualStyleRef.current,
          }),
        [GENERATION_TYPES.ENVIRONMENTS]: () =>
          resumeEnvironmentGeneration(projectId, {
            retry_failed,
            style: style ?? visualStyleRef.current,
          }),
      }

      try {
        const raw = await resumeHandlers[type]()
        applyHandlers.current[type]?.(raw?.progress ?? raw)
        if (getActivePollTypes().length > 0) {
          setMonitoring(true)
          schedulePoll()
        }
      } finally {
        if (mountedRef.current) {
          updateSlice(type, { resuming: false })
        }
      }
    },
    [getActivePollTypes, projectId, schedulePoll, updateSlice]
  )

  const publishProgress = useCallback(
    (type, rawProgress) => {
      userPausedRef.current[type] = false
      applyHandlers.current[type]?.(rawProgress)
      if (getActivePollTypes().length > 0) {
        setMonitoring(true)
        schedulePoll()
      }
    },
    [getActivePollTypes, schedulePoll]
  )

  const contextValue = useMemo(() => {
    const statusKeyFor = (type) =>
      type === GENERATION_TYPES.SCENES
        ? 'sceneGenerationStatus'
        : type === GENERATION_TYPES.CHARACTERS
          ? 'characterGenerationStatus'
          : 'environmentGenerationStatus'

    const buildSlice = (type) => {
      const status =
        sliceState[type].progress?.status ?? projectRef.current?.[statusKeyFor(type)] ?? null
      const remaining = sliceState[type].progress?.remaining ?? 0
      const typeMonitoring =
        isGenerationInProgress(status) ||
        remaining > 0 ||
        Boolean(sliceState[type].progress?.queued) ||
        Boolean(sliceState[type].progress?.running)

      return {
        delegated: true,
        progress: sliceState[type].progress,
        monitoring: typeMonitoring,
        isStuck: sliceState[type].isStuck,
        resuming: sliceState[type].resuming,
        cancelling: sliceState[type].cancelling,
        isCancelled:
          sliceState[type].progress?.status === PROJECT_GEN_STATUS.CANCELLED ||
          projectRef.current?.[statusKeyFor(type)] === PROJECT_GEN_STATUS.CANCELLED,
        canCancel: isGenerationInProgress(status),
        canResume:
          sliceState[type].progress?.status === PROJECT_GEN_STATUS.CANCELLED ||
          sliceState[type].progress?.status === PROJECT_GEN_STATUS.STALLED ||
          sliceState[type].isStuck ||
          Boolean(sliceState[type].progress?.stalled),
        handleCancelGeneration: () => handleCancel(type),
        handleResumeGeneration: (retryFailed = false, style) =>
          handleResume(type, { retry_failed: retryFailed, style }),
        refreshProgress: () => refreshType(type),
        publishProgress: (raw) => publishProgress(type, raw),
      }
    }

    return {
      monitoring,
      refreshAll,
      slices: {
        [GENERATION_TYPES.SCENES]: buildSlice(GENERATION_TYPES.SCENES),
        [GENERATION_TYPES.CHARACTERS]: buildSlice(GENERATION_TYPES.CHARACTERS),
        [GENERATION_TYPES.ENVIRONMENTS]: buildSlice(GENERATION_TYPES.ENVIRONMENTS),
      },
    }
  }, [handleCancel, handleResume, monitoring, publishProgress, refreshAll, refreshType, sliceState])

  return (
    <ProjectGenerationContext.Provider value={contextValue}>
      {children}
    </ProjectGenerationContext.Provider>
  )
}

export function useProjectGenerationSlice(type, { visualStyle } = {}) {
  const context = useContext(ProjectGenerationContext)
  const styleRef = useRef(visualStyle)

  useEffect(() => {
    styleRef.current = visualStyle
  }, [visualStyle])

  if (!context) return null

  const slice = context.slices[type]
  if (!slice) return null

  return {
    ...slice,
    handleResumeGeneration: (retryFailed = false) =>
      slice.handleResumeGeneration(retryFailed, styleRef.current),
  }
}

export function useProjectGenerationOptional() {
  return useContext(ProjectGenerationContext)
}
