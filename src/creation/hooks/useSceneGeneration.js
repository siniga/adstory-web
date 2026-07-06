import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSceneGenerationProgress,
  resumeSceneGeneration,
  retrySceneGeneration,
  startSceneGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  allScenesCompleted,
  allScenesFinished,
  createSceneGenerationStuckTracker,
  evaluateSceneGenerationStuck,
  isSceneGenerationInProgress,
  isSceneGenerationTerminal,
  mergeProgressScenes,
  mergeScenesWithPriority,
  normalizeSceneGenerationProgress,
  resetSceneGenerationStuckTracker,
  shouldStopScenePolling,
} from '../sceneGenerationStatus'
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

function buildMetaFromProject(project = {}, progress = null) {
  if (!project || Object.keys(project).length === 0) {
    return applyProgressMeta(progress ?? {})
  }

  return {
    sceneGenerationStatus:
      project.sceneGenerationStatus ?? progress?.status ?? null,
    sceneGenerationTotal: project.sceneGenerationTotal ?? progress?.total ?? 0,
    sceneGenerationCompleted:
      project.sceneGenerationCompleted ?? progress?.completed ?? 0,
    sceneGenerationFailed: project.sceneGenerationFailed ?? progress?.failed ?? 0,
    sceneGenerationStartedAt:
      project.sceneGenerationStartedAt ??
      progress?.project?.scene_generation_started_at ??
      null,
    sceneGenerationFinishedAt:
      project.sceneGenerationFinishedAt ??
      progress?.project?.scene_generation_finished_at ??
      null,
    ...(project.aiTasksSummary != null ? { aiTasksSummary: project.aiTasksSummary } : {}),
  }
}

export default function useSceneGeneration({
  enabled = false,
  projectId,
  initialStatus = null,
  initialStartedAt = null,
  scenes = [],
  fallbackScenes = [],
  refreshFullProject,
  onScenesChange,
  onGenerationMetaChange,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [retryingSceneId, setRetryingSceneId] = useState(null)
  const [isStuck, setIsStuck] = useState(false)
  const [resuming, setResuming] = useState(null)

  const scenesRef = useRef(scenes)
  const fallbackScenesRef = useRef(fallbackScenes)
  const generationStartedRef = useRef(false)
  const initCompletedRef = useRef(false)
  const pollTimerRef = useRef(null)
  const stuckTrackerRef = useRef(createSceneGenerationStuckTracker())
  const mountedRef = useRef(true)
  const terminalLoadPromiseRef = useRef(null)
  const terminalFullLoadedRef = useRef(false)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    fallbackScenesRef.current = fallbackScenes
  }, [fallbackScenes])

  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      projectIdRef.current = projectId
      generationStartedRef.current = false
      initCompletedRef.current = false
      terminalFullLoadedRef.current = false
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
      const formatted = formatUserFriendlyError(
        err instanceof Error ? err.message : fallback
      )
      onError?.(formatted)
    },
    [onError]
  )

  const updateStuckState = useCallback((nextProgress) => {
    const stuck = evaluateSceneGenerationStuck(nextProgress, stuckTrackerRef.current)
    setIsStuck(stuck)
  }, [])

  const applyScenesToState = useCallback(
    (sources, { readOnly = false } = {}) => {
      const hasBackendScenes =
        (sources.fullProjectScenes?.length ?? 0) > 0 ||
        (sources.progressScenes?.length ?? 0) > 0

      if (readOnly && hasBackendScenes) {
        return scenesRef.current
      }

      const merged = mergeScenesWithPriority({
        fullProjectScenes: sources.fullProjectScenes ?? [],
        progressScenes: sources.progressScenes ?? [],
        localScenes: hasBackendScenes ? [] : (sources.localScenes ?? scenesRef.current),
        fallbackScenes: sources.fallbackScenes ?? fallbackScenesRef.current ?? [],
      })

      if (!merged.length) {
        return scenesRef.current
      }

      const nextScenes = scenesRef.current.length
        ? mergeProgressScenes(scenesRef.current, merged)
        : merged

      onScenesChange?.(nextScenes)
      return nextScenes
    },
    [onScenesChange]
  )

  const publishProgress = useCallback(
    (nextProgress, scenesForCounts = scenesRef.current, refreshedProject = null) => {
      if (!nextProgress) return

      const normalized = normalizeSceneGenerationProgress(nextProgress, scenesForCounts)
      setProgress(normalized)
      updateStuckState(normalized)

      const meta = refreshedProject
        ? buildMetaFromProject(refreshedProject, normalized)
        : applyProgressMeta({
            ...normalized,
            startedAt: initialStartedAt,
            finishedAt: normalized.project?.scene_generation_finished_at ?? null,
          })

      onGenerationMetaChange?.(meta)
    },
    [initialStartedAt, onGenerationMetaChange, updateStuckState]
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

  const loadFullProjectScenes = useCallback(async () => {
    if (!refreshFullProject) {
      return { loadedScenes: scenesRef.current, refreshedProject: null }
    }

    if (terminalFullLoadedRef.current) {
      return { loadedScenes: scenesRef.current, refreshedProject: null }
    }

    logFullLoadedOnce('scenes generation complete')
    terminalFullLoadedRef.current = true

    const refreshedProject = await refreshFullProject()
    const loadedScenes = applyScenesToState({
      fullProjectScenes: refreshedProject?.scenes ?? [],
      fallbackScenes: fallbackScenesRef.current ?? [],
    })

    console.log('[Scenes] full project loaded', loadedScenes.length)
    return { loadedScenes, refreshedProject }
  }, [applyScenesToState, refreshFullProject])

  const loadTerminalProjectState = useCallback(
    async (nextProgress) => {
      if (terminalLoadPromiseRef.current) {
        return terminalLoadPromiseRef.current
      }

      terminalLoadPromiseRef.current = (async () => {
        let refreshedProject = null
        let loadedScenes = scenesRef.current

        if (refreshFullProject) {
          const result = await loadFullProjectScenes()
          loadedScenes = result.loadedScenes
          refreshedProject = result.refreshedProject
        } else if (nextProgress?.scenes?.length) {
          loadedScenes = applyScenesToState({
            progressScenes: nextProgress.scenes,
          })
        }

        publishProgress(nextProgress, loadedScenes, refreshedProject)
        return loadedScenes
      })()

      try {
        return await terminalLoadPromiseRef.current
      } finally {
        terminalLoadPromiseRef.current = null
      }
    },
    [applyScenesToState, loadFullProjectScenes, publishProgress, refreshFullProject]
  )

  const applyProgressReadOnly = useCallback(
    (nextProgress) => {
      if (!nextProgress) return scenesRef.current

      const currentScenes = scenesRef.current
      if (shouldStopScenePolling(nextProgress, currentScenes)) {
        publishProgress(nextProgress, currentScenes)
        return currentScenes
      }

      const loadedScenes = applyScenesToState({
        progressScenes: nextProgress.scenes ?? [],
      })

      publishProgress(nextProgress, loadedScenes)
      return loadedScenes
    },
    [applyScenesToState, publishProgress]
  )

  const finalizeTerminalProgress = useCallback(
    async (nextProgress) => {
      await loadTerminalProjectState(nextProgress)
      if (mountedRef.current) {
        stopPolling(true)
        setIsStuck(false)
      }
    },
    [loadTerminalProjectState, stopPolling]
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
        if (isSceneGenerationTerminal(nextProgress.status)) {
          await finalizeTerminalProgress(nextProgress)
        } else {
          publishProgress(nextProgress, loadedScenes)
          stopPolling(true)
        }
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
  }, [applyProgressReadOnly, finalizeTerminalProgress, projectId, publishProgress, reportError, stopPolling])

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
    if (!projectId || generationStartedRef.current) return

    generationStartedRef.current = true
    resetSceneGenerationStuckTracker(stuckTrackerRef.current)

    try {
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
    }
  }, [
    applyProgressReadOnly,
    beginMonitoring,
    finalizeTerminalProgress,
    projectId,
    reportError,
    schedulePoll,
  ])

  useEffect(() => {
    if (!enabled || !projectId) {
      stopPolling()
      setIsStuck(false)
      return undefined
    }

    if (initCompletedRef.current) {
      return () => stopPolling()
    }

    let cancelled = false

    const initialize = async () => {
      resetSceneGenerationStuckTracker(stuckTrackerRef.current)
      initCompletedRef.current = true

      const sceneList = scenesRef.current
      const status = initialStatus

      if (sceneList.length > 0) {
        console.log('[Scenes] start generation skipped because scenes exist')
        generationStartedRef.current = true
      }

      if (shouldStopScenePolling({ status }, sceneList)) {
        if (allScenesCompleted(sceneList)) {
          publishProgress(
            normalizeSceneGenerationProgress(
              {
                status: status === 'completed_with_errors' ? status : 'completed',
                total: sceneList.length,
                completed: sceneList.filter((s) => s.status === 'completed').length,
                failed: sceneList.filter((s) => s.status === 'failed').length,
              },
              sceneList
            ),
            sceneList,
            null
          )
        }
        stopPolling(true)
        return
      }

      if (sceneList.length > 0) {
        if (isSceneGenerationInProgress(status)) {
          beginMonitoring()
        } else if (isSceneGenerationTerminal(status)) {
          try {
            const nextProgress = await getSceneGenerationProgress(projectId)
            if (!cancelled && mountedRef.current) {
              applyProgressReadOnly(nextProgress)
              if (!shouldStopScenePolling(nextProgress, scenesRef.current)) {
                beginMonitoring()
              } else {
                stopPolling(true)
              }
            }
          } catch (err) {
            if (!cancelled && mountedRef.current) {
              reportError(err, 'Failed to load scene generation progress')
            }
          }
        }
        return
      }

      if (!generationStartedRef.current) {
        startGeneration()
      }
    }

    initialize()

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [
    applyProgressReadOnly,
    beginMonitoring,
    enabled,
    initialStatus,
    projectId,
    publishProgress,
    reportError,
    startGeneration,
    stopPolling,
  ])

  const handleRetryScene = useCallback(
    async (scene) => {
      if (!projectId || !scene?.apiId || retryingSceneId) return

      setRetryingSceneId(scene.apiId)
      try {
        const nextProgress = await retrySceneGeneration(projectId, scene.apiId)
        if (!mountedRef.current) return

        resetSceneGenerationStuckTracker(stuckTrackerRef.current)
        applyProgressReadOnly(nextProgress)
        setIsStuck(false)

        if (shouldStopScenePolling(nextProgress, scenesRef.current)) {
          await finalizeTerminalProgress(nextProgress)
          return
        }

        schedulePoll()
      } catch (err) {
        reportError(err, 'Failed to retry scene generation')
      } finally {
        if (mountedRef.current) {
          setRetryingSceneId(null)
        }
      }
    },
    [applyProgressReadOnly, finalizeTerminalProgress, projectId, reportError, retryingSceneId, schedulePoll]
  )

  const handleResumeGeneration = useCallback(
    async (retryFailed = false) => {
      if (!projectId || resuming) return

      setResuming(retryFailed ? 'retry_failed' : 'resume')
      try {
        const nextProgress = await resumeSceneGeneration(projectId, {
          retry_failed: retryFailed,
        })
        if (!mountedRef.current) return

        resetSceneGenerationStuckTracker(stuckTrackerRef.current)
        applyProgressReadOnly(nextProgress)
        setIsStuck(false)

        if (shouldStopScenePolling(nextProgress, scenesRef.current)) {
          await finalizeTerminalProgress(nextProgress)
          return
        }

        schedulePoll()
      } catch (err) {
        reportError(err, 'Failed to resume scene generation')
      } finally {
        if (mountedRef.current) {
          setResuming(null)
        }
      }
    },
    [applyProgressReadOnly, finalizeTerminalProgress, projectId, reportError, resuming, schedulePoll]
  )

  return {
    progress,
    monitoring,
    retryingSceneId,
    isStuck,
    resuming,
    handleRetryScene,
    handleResumeGeneration,
  }
}
