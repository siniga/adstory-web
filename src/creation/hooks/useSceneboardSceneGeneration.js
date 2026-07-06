import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSceneGenerationProgress,
  startSceneGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  isSceneGenerationInProgress,
  isSceneGenerationTerminal,
  normalizeSceneGenerationProgress,
  shouldStopScenePolling,
} from '../sceneGenerationStatus'
import { patchSceneboardScenesFromProgress, areSceneboardScenesGenerationSettled } from '../sceneboardStatus'

import {
  logFullLoadedOnce,
  logPollingStarted,
  logPollingStopped,
} from '../generationPolling'

const POLL_INTERVAL_MS = 2000
const PROGRESS_ENDPOINT = 'GET /scenes/progress'

function applyProgressMeta(progress) {
  return {
    sceneGenerationStatus: progress.status ?? null,
    sceneGenerationTotal: progress.total ?? 0,
    sceneGenerationCompleted: progress.completed ?? 0,
    sceneGenerationFailed: progress.failed ?? 0,
    sceneGenerationStartedAt:
      progress.project?.scene_generation_started_at ?? progress.startedAt ?? null,
    sceneGenerationFinishedAt:
      progress.project?.scene_generation_finished_at ?? progress.finishedAt ?? null,
  }
}

export default function useSceneboardSceneGeneration({
  enabled = false,
  projectId,
  screenplay = '',
  initialStatus = null,
  initialStartedAt = null,
  scenes = [],
  loadProjectOnComplete,
  reloadSceneboard,
  onScenesChange,
  onGenerationMetaChange,
  onGenerationComplete,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [starting, setStarting] = useState(false)

  const scenesRef = useRef(scenes)
  const generationStartedRef = useRef(false)
  const initCompletedRef = useRef(false)
  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const terminalLoadPromiseRef = useRef(null)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      projectIdRef.current = projectId
      generationStartedRef.current = false
      initCompletedRef.current = false
    }
  }, [projectId])

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

  const reportError = useCallback(
    (err, fallback) => {
      onError?.(formatUserFriendlyError(err instanceof Error ? err.message : fallback))
    },
    [onError]
  )

  const publishProgress = useCallback(
    (nextProgress, scenesForCounts = scenesRef.current) => {
      if (!nextProgress) return

      const normalized = normalizeSceneGenerationProgress(nextProgress, scenesForCounts)
      setProgress(normalized)
      onGenerationMetaChange?.({
        ...applyProgressMeta({
          ...normalized,
          startedAt: initialStartedAt,
          finishedAt: normalized.project?.scene_generation_finished_at ?? null,
        }),
      })
    },
    [initialStartedAt, onGenerationMetaChange]
  )

  const stopPolling = useCallback((reason) => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setMonitoring(false)
    if (reason) {
      logPollingStopped(PROGRESS_ENDPOINT)
    }
  }, [])

  const applyProgressScenes = useCallback(
    (progressScenes, { replace = false } = {}) => {
      if (!progressScenes?.length) return scenesRef.current

      const next = replace
        ? patchSceneboardScenesFromProgress([], progressScenes)
        : patchSceneboardScenesFromProgress(scenesRef.current, progressScenes)

      onScenesChange?.(next)
      return next
    },
    [onScenesChange]
  )

  const reloadAuthoritativeSceneboard = useCallback(async () => {
    const completeLoad = loadProjectOnComplete

    if (completeLoad) {
      logFullLoadedOnce('scene generation complete')
      const refreshedProject = await completeLoad()
      const loadedScenes = refreshedProject?.scenes ?? scenesRef.current
      console.log('[Sceneboard] ProjectStore after terminal load', loadedScenes.length)
      if (loadedScenes.length) {
        onScenesChange?.(loadedScenes)
      }
      return loadedScenes.length ? loadedScenes : scenesRef.current
    }

    if (!reloadSceneboard) {
      return scenesRef.current
    }

    const loadedScenes = await reloadSceneboard()
    console.log('[Sceneboard] sceneboard reloaded after generation', loadedScenes.length)
    return loadedScenes
  }, [loadProjectOnComplete, onScenesChange, reloadSceneboard])

  const loadTerminalState = useCallback(
    async (nextProgress) => {
      if (terminalLoadPromiseRef.current) {
        return terminalLoadPromiseRef.current
      }

      terminalLoadPromiseRef.current = (async () => {
        let loadedScenes = scenesRef.current

        if (reloadSceneboard || loadProjectOnComplete) {
          loadedScenes = await reloadAuthoritativeSceneboard()
        } else if (nextProgress?.scenes?.length) {
          loadedScenes = applyProgressScenes(nextProgress.scenes, { replace: true })
        }

        publishProgress(nextProgress, loadedScenes)
        onGenerationComplete?.(loadedScenes)
        return loadedScenes
      })()

      try {
        return await terminalLoadPromiseRef.current
      } finally {
        terminalLoadPromiseRef.current = null
      }
    },
    [
      applyProgressScenes,
      loadProjectOnComplete,
      onGenerationComplete,
      publishProgress,
      reloadAuthoritativeSceneboard,
      reloadSceneboard,
    ]
  )

  const finalizeTerminalProgress = useCallback(
    async (nextProgress) => {
      await loadTerminalState(nextProgress)
      if (mountedRef.current) {
        stopPolling(true)
      }
    },
    [loadTerminalState, stopPolling]
  )

  const applyProgressReadOnly = useCallback(
    (nextProgress) => {
      if (!nextProgress) return scenesRef.current

      const loadedScenes = nextProgress.scenes?.length
        ? applyProgressScenes(nextProgress.scenes)
        : scenesRef.current

      publishProgress(nextProgress, loadedScenes)
      return loadedScenes
    },
    [applyProgressScenes, publishProgress]
  )

  const pollOnce = useCallback(async () => {
    if (!projectId || !mountedRef.current) return null

    if (shouldStopScenePolling(null, scenesRef.current)) {
      stopPolling(true)
      return null
    }

    try {
      const nextProgress = await getSceneGenerationProgress(projectId)
      if (!mountedRef.current) return null

      const loadedScenes = applyProgressReadOnly(nextProgress)

      if (shouldStopScenePolling(nextProgress, loadedScenes)) {
        await finalizeTerminalProgress(nextProgress)
        return nextProgress
      }

      return nextProgress
    } catch (err) {
      if (mountedRef.current) {
        reportError(err, 'Failed to load scene generation progress')
        stopPolling()
      }
      return null
    }
  }, [applyProgressReadOnly, finalizeTerminalProgress, projectId, reportError, stopPolling])

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) return
    if (shouldStopScenePolling(null, scenesRef.current)) {
      stopPolling(true)
      return
    }

    setMonitoring(true)
    pollTimerRef.current = setTimeout(async () => {
      pollTimerRef.current = null
      const nextProgress = await pollOnce()
      if (
        mountedRef.current &&
        nextProgress &&
        !shouldStopScenePolling(nextProgress, scenesRef.current)
      ) {
        schedulePoll()
      }
    }, POLL_INTERVAL_MS)
  }, [pollOnce, stopPolling])

  const beginMonitoring = useCallback(() => {
    if (shouldStopScenePolling(null, scenesRef.current)) {
      stopPolling(true)
      return
    }

    logPollingStarted(PROGRESS_ENDPOINT)
    setMonitoring(true)
    pollOnce().then((nextProgress) => {
      if (
        mountedRef.current &&
        nextProgress &&
        !shouldStopScenePolling(nextProgress, scenesRef.current)
      ) {
        schedulePoll()
      }
    })
  }, [pollOnce, schedulePoll, stopPolling])

  const startGeneration = useCallback(async () => {
    if (!projectId || generationStartedRef.current || starting) return

    setStarting(true)
    generationStartedRef.current = true

    try {
      console.log('[Sceneboard] starting scene generation from screenplay')
      const nextProgress = await startSceneGeneration(projectId)
      if (!mountedRef.current) return

      applyProgressReadOnly(nextProgress)

      if (shouldStopScenePolling(nextProgress, scenesRef.current)) {
        await finalizeTerminalProgress(nextProgress)
        return
      }

      schedulePoll()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const alreadyRunning = message.toLowerCase().includes('already running')

      if (alreadyRunning) {
        beginMonitoring()
        return
      }

      generationStartedRef.current = false
      reportError(err, 'Failed to start scene generation')
    } finally {
      if (mountedRef.current) {
        setStarting(false)
      }
    }
  }, [
    applyProgressReadOnly,
    beginMonitoring,
    finalizeTerminalProgress,
    projectId,
    reportError,
    schedulePoll,
    starting,
  ])

  useEffect(() => {
    if (!enabled || !projectId) {
      stopPolling()
      return undefined
    }

    if (initCompletedRef.current) {
      return () => stopPolling()
    }

    let cancelled = false
    const hasScreenplay = Boolean(screenplay?.trim())

    const initialize = async () => {
      initCompletedRef.current = true

      const sceneList = scenesRef.current
      const status = initialStatus

      if (sceneList.length > 0) {
        console.log('[Sceneboard] existing scenes found, skipping generation')
        generationStartedRef.current = true

        if (isSceneGenerationInProgress(status)) {
          beginMonitoring()
        }
        return
      }

      if (!hasScreenplay) {
        console.log('[Sceneboard] no screenplay, skipping auto scene generation')
        return
      }

      if (isSceneGenerationInProgress(status)) {
        console.log('[Sceneboard] resuming scene generation in progress')
        generationStartedRef.current = true
        beginMonitoring()
        return
      }

      if (isSceneGenerationTerminal(status)) {
        return
      }

      if (!generationStartedRef.current && !cancelled) {
        await startGeneration()
      }
    }

    initialize()

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [
    beginMonitoring,
    enabled,
    initialStatus,
    projectId,
    screenplay,
    startGeneration,
    stopPolling,
  ])

  const sceneGenerationActive =
    !areSceneboardScenesGenerationSettled(scenes) &&
    (starting ||
      monitoring ||
      isSceneGenerationInProgress(initialStatus) ||
      isSceneGenerationInProgress(progress?.status))

  const sceneGenerationFailed =
    Boolean(screenplay?.trim()) &&
    scenes.length === 0 &&
    (progress?.status === 'failed' ||
      (isSceneGenerationTerminal(progress?.status) && (progress?.failed ?? 0) > 0))

  return {
    progress,
    monitoring,
    starting,
    sceneGenerationActive,
    sceneGenerationFailed,
  }
}
