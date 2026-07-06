import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getShotGenerationProgress,
  mapAdstoryShots,
  startShotGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  createGenerationStuckTracker,
  evaluateGenerationStuck,
  isGenerationInProgress,
  isGenerationTerminal,
  resetGenerationStuckTracker,
} from '../aiGenerationStatus'
import {
  countProjectShots,
  hasProjectShots,
  mergeShotGroups,
  mergeShotGroupsWithPriority,
  normalizeShotGenerationProgress,
  shouldAutoStartShotGeneration,
  shouldStopShotPolling,
} from '../shotGenerationStatus'
import {
  logFullLoadedOnce,
  logPollingStarted,
  logPollingStopped,
} from '../generationPolling'

const POLL_INTERVAL_MS = 2000
const PROGRESS_ENDPOINT = 'GET /shots/progress'

function applyProgressMeta(progress) {
  return {
    shotGenerationStatus: progress.status ?? null,
    shotGenerationTotal: progress.total ?? 0,
    shotGenerationCompleted: progress.completed ?? 0,
    shotGenerationFailed: progress.failed ?? 0,
    shotGenerationStartedAt:
      progress.project?.shot_generation_started_at ?? progress.startedAt ?? null,
    shotGenerationFinishedAt:
      progress.project?.shot_generation_finished_at ?? progress.finishedAt ?? null,
  }
}

function buildMetaFromProject(project = {}, progress = null) {
  if (!project || Object.keys(project).length === 0) {
    return applyProgressMeta(progress ?? {})
  }

  return {
    shotGenerationStatus: project.shotGenerationStatus ?? progress?.status ?? null,
    shotGenerationTotal: project.shotGenerationTotal ?? progress?.total ?? 0,
    shotGenerationCompleted:
      project.shotGenerationCompleted ?? progress?.completed ?? 0,
    shotGenerationFailed: project.shotGenerationFailed ?? progress?.failed ?? 0,
    shotGenerationStartedAt:
      project.shotGenerationStartedAt ??
      progress?.project?.shot_generation_started_at ??
      null,
    shotGenerationFinishedAt:
      project.shotGenerationFinishedAt ??
      progress?.project?.shot_generation_finished_at ??
      null,
    ...(project.aiTasksSummary != null ? { aiTasksSummary: project.aiTasksSummary } : {}),
  }
}

export default function useShotGeneration({
  enabled = false,
  projectId,
  initialStatus = null,
  initialStartedAt = null,
  visualStyle = '',
  shotGroups = [],
  projectScenes = [],
  fallbackShotGroups = [],
  refreshFullProject,
  onShotsChange,
  onGenerationMetaChange,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const [resuming, setResuming] = useState(false)

  const shotGroupsRef = useRef(shotGroups)
  const projectScenesRef = useRef(projectScenes)
  const fallbackShotGroupsRef = useRef(fallbackShotGroups)
  const generationStartedRef = useRef(false)
  const initCompletedRef = useRef(false)
  const pollTimerRef = useRef(null)
  const stuckTrackerRef = useRef(createGenerationStuckTracker())
  const mountedRef = useRef(true)
  const terminalLoadPromiseRef = useRef(null)
  const terminalFullLoadedRef = useRef(false)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    shotGroupsRef.current = shotGroups
  }, [shotGroups])

  useEffect(() => {
    projectScenesRef.current = projectScenes
  }, [projectScenes])

  useEffect(() => {
    fallbackShotGroupsRef.current = fallbackShotGroups
  }, [fallbackShotGroups])

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
      onError?.(formatUserFriendlyError(err instanceof Error ? err.message : fallback))
    },
    [onError]
  )

  const updateStuckState = useCallback((nextProgress) => {
    setIsStuck(evaluateGenerationStuck(nextProgress, stuckTrackerRef.current))
  }, [])

  const applyShotsToState = useCallback(
    (sources) => {
      const hasBackendShots =
        (sources.fullProjectGroups?.length ?? 0) > 0 ||
        (sources.progressGroups?.length ?? 0) > 0

      const merged = mergeShotGroupsWithPriority({
        fullProjectGroups: sources.fullProjectGroups ?? [],
        progressGroups: sources.progressGroups ?? [],
        localGroups: hasBackendShots ? [] : (sources.localGroups ?? shotGroupsRef.current),
        fallbackGroups: sources.fallbackGroups ?? fallbackShotGroupsRef.current ?? [],
      })

      if (!merged.length) {
        return shotGroupsRef.current
      }

      const nextGroups = shotGroupsRef.current.length
        ? mergeShotGroups(shotGroupsRef.current, merged)
        : merged

      onShotsChange?.(nextGroups)
      return nextGroups
    },
    [onShotsChange]
  )

  const publishProgress = useCallback(
    (nextProgress, groupsForDisplay = shotGroupsRef.current, refreshedProject = null) => {
      if (!nextProgress) return

      const normalized = normalizeShotGenerationProgress(nextProgress, groupsForDisplay)
      setProgress(normalized)
      updateStuckState(normalized)

      const meta = refreshedProject
        ? buildMetaFromProject(refreshedProject, normalized)
        : applyProgressMeta({
            ...normalized,
            startedAt: initialStartedAt,
            finishedAt: normalized.project?.shot_generation_finished_at ?? null,
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

  const loadFullProjectShots = useCallback(async () => {
    if (!refreshFullProject) {
      return { loadedGroups: shotGroupsRef.current, refreshedProject: null }
    }

    if (terminalFullLoadedRef.current) {
      return { loadedGroups: shotGroupsRef.current, refreshedProject: null }
    }

    logFullLoadedOnce('shots generation complete')
    terminalFullLoadedRef.current = true

    const refreshedProject = await refreshFullProject()
    const loadedGroups = applyShotsToState({
      fullProjectGroups: refreshedProject?.shotGroups ?? [],
      fallbackGroups: fallbackShotGroupsRef.current ?? [],
    })

    console.log('[Shots] full project loaded', countProjectShots(loadedGroups))
    return { loadedGroups, refreshedProject }
  }, [applyShotsToState, refreshFullProject])

  const progressGroupsFromResponse = useCallback((nextProgress) => {
    if (nextProgress?.shotGroups?.length) {
      return nextProgress.shotGroups
    }
    if (nextProgress?.shots?.length) {
      return mapAdstoryShots(nextProgress.shots, projectScenesRef.current)
    }
    return []
  }, [])

  const loadTerminalProjectState = useCallback(
    async (nextProgress) => {
      if (terminalLoadPromiseRef.current) {
        return terminalLoadPromiseRef.current
      }

      terminalLoadPromiseRef.current = (async () => {
        let refreshedProject = null
        let loadedGroups = shotGroupsRef.current

        if (refreshFullProject) {
          const result = await loadFullProjectShots()
          loadedGroups = result.loadedGroups
          refreshedProject = result.refreshedProject
        } else {
          const progressGroups = progressGroupsFromResponse(nextProgress)
          if (progressGroups.length) {
            loadedGroups = applyShotsToState({ progressGroups })
          }
        }

        publishProgress(nextProgress, loadedGroups, refreshedProject)
        return loadedGroups
      })()

      try {
        return await terminalLoadPromiseRef.current
      } finally {
        terminalLoadPromiseRef.current = null
      }
    },
    [applyShotsToState, loadFullProjectShots, progressGroupsFromResponse, publishProgress, refreshFullProject]
  )

  const applyProgressReadOnly = useCallback(
    (nextProgress) => {
      if (!nextProgress) return shotGroupsRef.current

      const currentGroups = shotGroupsRef.current
      if (shouldStopShotPolling(nextProgress, currentGroups)) {
        publishProgress(nextProgress, currentGroups)
        return currentGroups
      }

      const progressGroups = progressGroupsFromResponse(nextProgress)
      const loadedGroups = progressGroups.length
        ? applyShotsToState({ progressGroups })
        : currentGroups

      publishProgress(nextProgress, loadedGroups)
      return loadedGroups
    },
    [applyShotsToState, progressGroupsFromResponse, publishProgress]
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

    if (shouldStopShotPolling(null, shotGroupsRef.current)) {
      stopPolling(true)
      return null
    }

    try {
      const nextProgress = await getShotGenerationProgress(projectId, projectScenesRef.current)
      if (!mountedRef.current) return null

      const loadedGroups = applyProgressReadOnly(nextProgress)

      if (shouldStopShotPolling(nextProgress, loadedGroups)) {
        if (isGenerationTerminal(nextProgress.status)) {
          await finalizeTerminalProgress(nextProgress)
        } else {
          publishProgress(nextProgress, loadedGroups)
          stopPolling(true)
        }
        return nextProgress
      }

      return nextProgress
    } catch (err) {
      if (mountedRef.current) {
        reportError(err, 'Failed to load shot generation progress')
        stopPolling()
      }
      return null
    }
  }, [
    applyProgressReadOnly,
    finalizeTerminalProgress,
    projectId,
    publishProgress,
    reportError,
    stopPolling,
  ])

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) return
    if (shouldStopShotPolling(null, shotGroupsRef.current)) {
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
        !shouldStopShotPolling(nextProgress, shotGroupsRef.current)
      ) {
        schedulePoll()
      }
    }, POLL_INTERVAL_MS)
  }, [pollOnce, stopPolling])

  const beginMonitoring = useCallback(() => {
    if (shouldStopShotPolling(null, shotGroupsRef.current)) {
      stopPolling(true)
      return
    }

    logPollingStarted(PROGRESS_ENDPOINT)
    setMonitoring(true)
    pollOnce().then((nextProgress) => {
      if (
        mountedRef.current &&
        nextProgress &&
        !shouldStopShotPolling(nextProgress, shotGroupsRef.current)
      ) {
        schedulePoll()
      }
    })
  }, [pollOnce, schedulePoll, stopPolling])

  const startGeneration = useCallback(async () => {
    if (!projectId || generationStartedRef.current) return

    generationStartedRef.current = true
    resetGenerationStuckTracker(stuckTrackerRef.current)

    try {
      const nextProgress = await startShotGeneration(projectId, { style: visualStyle })
      if (!mountedRef.current) return

      applyProgressReadOnly(nextProgress)

      if (shouldStopShotPolling(nextProgress, shotGroupsRef.current)) {
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
      reportError(err, 'Failed to start shot generation')
    }
  }, [
    applyProgressReadOnly,
    beginMonitoring,
    finalizeTerminalProgress,
    projectId,
    reportError,
    schedulePoll,
    visualStyle,
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
      resetGenerationStuckTracker(stuckTrackerRef.current)
      initCompletedRef.current = true

      const loadedGroups = shotGroupsRef.current
      const status = initialStatus

      if (shouldStopShotPolling({ status }, loadedGroups)) {
        publishProgress(
          normalizeShotGenerationProgress(
            {
              status: status === 'completed_with_errors' ? status : 'completed',
              total: loadedGroups.length,
              completed: countProjectShots(loadedGroups),
              failed: 0,
            },
            loadedGroups
          ),
          loadedGroups,
          null
        )
        stopPolling(true)
        return
      }

      if (hasProjectShots(loadedGroups)) {
        console.log('[Shots] start generation skipped because shots exist')
        generationStartedRef.current = true

        if (isGenerationInProgress(status)) {
          beginMonitoring()
        } else if (isGenerationTerminal(status)) {
          try {
            const nextProgress = await getShotGenerationProgress(
              projectId,
              projectScenesRef.current
            )
            if (!cancelled && mountedRef.current) {
              applyProgressReadOnly(nextProgress)
              if (!shouldStopShotPolling(nextProgress, shotGroupsRef.current)) {
                beginMonitoring()
              } else {
                stopPolling(true)
              }
            }
          } catch (err) {
            if (!cancelled && mountedRef.current) {
              reportError(err, 'Failed to load shot generation progress')
            }
          }
        }
        return
      }

      if (isGenerationInProgress(status)) {
        generationStartedRef.current = true
        beginMonitoring()
        return
      }

      if (shouldAutoStartShotGeneration(status, { shotGroups: loadedGroups })) {
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

  const handleResumeGeneration = useCallback(async () => {
    if (!projectId || resuming) return

    setResuming(true)
    try {
      const nextProgress = await startShotGeneration(projectId, { style: visualStyle })
      if (!mountedRef.current) return

      resetGenerationStuckTracker(stuckTrackerRef.current)
      applyProgressReadOnly(nextProgress)
      setIsStuck(false)
      generationStartedRef.current = true

      if (shouldStopShotPolling(nextProgress, shotGroupsRef.current)) {
        await finalizeTerminalProgress(nextProgress)
        return
      }

      schedulePoll()
    } catch (err) {
      reportError(err, 'Failed to resume shot generation')
    } finally {
      if (mountedRef.current) {
        setResuming(false)
      }
    }
  }, [
    applyProgressReadOnly,
    finalizeTerminalProgress,
    projectId,
    reportError,
    resuming,
    schedulePoll,
    visualStyle,
  ])

  return {
    progress,
    monitoring,
    isStuck,
    resuming,
    handleResumeGeneration,
  }
}
