import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getEnvironmentGenerationProgress,
  mapAdstoryEnvironments,
  resumeEnvironmentGeneration,
  retryEnvironmentGeneration,
  startEnvironmentGeneration,
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
  areEnvironmentsGenerationSettled,
  hasProjectEnvironments,
  mergeEnvironmentListsPreservingImages,
  normalizeEnvironmentGenerationProgress,
  normalizeEnvironmentList,
  patchEnvironmentsFromProgress,
  shouldStopEnvironmentPolling,
} from '../environmentGenerationStatus'
import { logPollingStarted, logPollingStopped } from '../generationPolling'

const POLL_INTERVAL_MS = 2000
const PROGRESS_ENDPOINT = 'GET /environments/progress'

function applyProgressMeta(progress) {
  return {
    environmentGenerationStatus: progress.status ?? null,
    environmentGenerationTotal: progress.total ?? 0,
    environmentGenerationCompleted: progress.completed ?? 0,
    environmentGenerationFailed: progress.failed ?? 0,
    environmentGenerationStartedAt:
      progress.project?.environment_generation_started_at ?? progress.startedAt ?? null,
    environmentGenerationFinishedAt:
      progress.project?.environment_generation_finished_at ?? progress.finishedAt ?? null,
  }
}

function buildMetaFromProject(project = {}, progress = null) {
  if (!project || Object.keys(project).length === 0) {
    return applyProgressMeta(progress ?? {})
  }

  return {
    environmentGenerationStatus:
      project.environmentGenerationStatus ?? progress?.status ?? null,
    environmentGenerationTotal:
      project.environmentGenerationTotal ?? progress?.total ?? 0,
    environmentGenerationCompleted:
      project.environmentGenerationCompleted ?? progress?.completed ?? 0,
    environmentGenerationFailed:
      project.environmentGenerationFailed ?? progress?.failed ?? 0,
    environmentGenerationStartedAt:
      project.environmentGenerationStartedAt ??
      progress?.project?.environment_generation_started_at ??
      null,
    environmentGenerationFinishedAt:
      project.environmentGenerationFinishedAt ??
      progress?.project?.environment_generation_finished_at ??
      null,
    ...(project.aiTasksSummary != null ? { aiTasksSummary: project.aiTasksSummary } : {}),
  }
}

export default function useEnvironmentGeneration({
  enabled = false,
  projectId,
  initialStatus = null,
  initialStartedAt = null,
  visualStyle = '',
  environments = [],
  fallbackEnvironments = [],
  reloadEnvironmentsOnComplete,
  loadProjectOnComplete,
  refreshFullProject,
  onEnvironmentsChange,
  onGenerationMetaChange,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const [resuming, setResuming] = useState(null)
  const [starting, setStarting] = useState(false)

  const environmentsRef = useRef(environments)
  const fallbackEnvironmentsRef = useRef(fallbackEnvironments)
  const generationStartedRef = useRef(false)
  const initCompletedRef = useRef(false)
  const pollTimerRef = useRef(null)
  const stuckTrackerRef = useRef(createGenerationStuckTracker())
  const mountedRef = useRef(true)
  const terminalLoadPromiseRef = useRef(null)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    environmentsRef.current = environments
  }, [environments])

  useEffect(() => {
    fallbackEnvironmentsRef.current = fallbackEnvironments
  }, [fallbackEnvironments])

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

  const updateStuckState = useCallback((nextProgress) => {
    if (nextProgress?.stalled) {
      setIsStuck(true)
      return
    }
    setIsStuck(evaluateGenerationStuck(nextProgress, stuckTrackerRef.current))
  }, [])

  const publishProgress = useCallback(
    (nextProgress, environmentsForDisplay = environmentsRef.current, refreshedProject = null) => {
      if (!nextProgress) return

      const normalized = normalizeEnvironmentGenerationProgress(
        nextProgress,
        environmentsForDisplay
      )
      setProgress(normalized)
      updateStuckState(normalized)

      const meta = refreshedProject
        ? buildMetaFromProject(refreshedProject, normalized)
        : applyProgressMeta({
            ...normalized,
            startedAt: initialStartedAt,
            finishedAt: normalized.project?.environment_generation_finished_at ?? null,
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

  const applyBackendEnvironments = useCallback(
    (backendEnvironments, { replace = false } = {}) => {
      const normalized = normalizeEnvironmentList(backendEnvironments)
      if (!normalized.length) {
        return environmentsRef.current
      }

      const next = replace
        ? mergeEnvironmentListsPreservingImages([], normalized)
        : patchEnvironmentsFromProgress(environmentsRef.current, normalized)

      onEnvironmentsChange?.(next)
      return next
    },
    [onEnvironmentsChange]
  )

  const progressEnvironmentsFromResponse = useCallback((nextProgress) => {
    if (nextProgress?.environments?.length) {
      return mapAdstoryEnvironments(nextProgress.environments)
    }
    return []
  }, [])

  const publishCompletedProgress = useCallback(
    (loadedEnvironments, refreshedProject = null) => {
      const completedProject = refreshedProject
        ? { ...refreshedProject, environmentGenerationStatus: 'completed' }
        : null

      publishProgress(
        normalizeEnvironmentGenerationProgress(
          {
            status: 'completed',
            total: loadedEnvironments.length,
            completed: loadedEnvironments.filter(
              (environment) => environment.image_status === 'completed'
            ).length,
            failed: loadedEnvironments.filter((environment) => environment.image_status === 'failed')
              .length,
            phase: 'images',
          },
          loadedEnvironments
        ),
        loadedEnvironments,
        completedProject
      )
      setIsStuck(false)
    },
    [publishProgress]
  )

  useEffect(() => {
    if (!enabled || !hasProjectEnvironments(environments)) return

    if (areEnvironmentsGenerationSettled(environments)) {
      stopPolling(true)
      setIsStuck(false)
      if (!isGenerationTerminal(progress?.status)) {
        publishCompletedProgress(environments, null)
      }
    }
  }, [enabled, environments, progress?.status, publishCompletedProgress, stopPolling])

  const loadTerminalProjectState = useCallback(
    async (nextProgress) => {
      if (terminalLoadPromiseRef.current) {
        return terminalLoadPromiseRef.current
      }

      const completeLoad =
        reloadEnvironmentsOnComplete ?? loadProjectOnComplete ?? refreshFullProject

      terminalLoadPromiseRef.current = (async () => {
        let refreshedProject = null
        let loadedEnvironments = environmentsRef.current

        if (completeLoad) {
          const result = await completeLoad()
          if (Array.isArray(result)) {
            loadedEnvironments = normalizeEnvironmentList(result)
            console.log('[Environments] ProjectStore after terminal load', loadedEnvironments.length)
          } else if (result && typeof result === 'object') {
            refreshedProject = result
            loadedEnvironments = normalizeEnvironmentList(
              result.environments ?? environmentsRef.current
            )
            console.log('[Environments] ProjectStore after terminal load', loadedEnvironments.length)
          }
        } else {
          const progressEnvironments = progressEnvironmentsFromResponse(nextProgress)
          if (progressEnvironments.length) {
            loadedEnvironments = applyBackendEnvironments(progressEnvironments, { replace: false })
          }
        }

        publishProgress(nextProgress, loadedEnvironments, refreshedProject)
        if (areEnvironmentsGenerationSettled(loadedEnvironments)) {
          publishCompletedProgress(loadedEnvironments, refreshedProject)
        }

        return loadedEnvironments
      })()

      try {
        return await terminalLoadPromiseRef.current
      } finally {
        terminalLoadPromiseRef.current = null
      }
    },
    [
      applyBackendEnvironments,
      loadProjectOnComplete,
      progressEnvironmentsFromResponse,
      publishCompletedProgress,
      publishProgress,
      refreshFullProject,
      reloadEnvironmentsOnComplete,
    ]
  )

  const applyProgressReadOnly = useCallback(
    (nextProgress) => {
      if (!nextProgress) return environmentsRef.current

      const progressEnvironments = progressEnvironmentsFromResponse(nextProgress)
      const loadedEnvironments = progressEnvironments.length
        ? applyBackendEnvironments(progressEnvironments, { replace: false })
        : environmentsRef.current

      publishProgress(nextProgress, loadedEnvironments)
      return loadedEnvironments
    },
    [applyBackendEnvironments, progressEnvironmentsFromResponse, publishProgress]
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

    if (shouldStopEnvironmentPolling(null, environmentsRef.current)) {
      stopPolling(true)
      return null
    }

    try {
      const nextProgress = await getEnvironmentGenerationProgress(projectId)
      if (!mountedRef.current) return null

      const loadedEnvironments = applyProgressReadOnly(nextProgress)

      if (shouldStopEnvironmentPolling(nextProgress, loadedEnvironments)) {
        await finalizeTerminalProgress(nextProgress)
        return nextProgress
      }

      return nextProgress
    } catch (err) {
      if (mountedRef.current) {
        reportError(err, 'Failed to load environment generation progress')
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
    if (shouldStopEnvironmentPolling(null, environmentsRef.current)) {
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
        !shouldStopEnvironmentPolling(nextProgress, environmentsRef.current)
      ) {
        schedulePoll()
      }
    }, POLL_INTERVAL_MS)
  }, [pollOnce, stopPolling])

  const beginMonitoring = useCallback(() => {
    if (shouldStopEnvironmentPolling(null, environmentsRef.current)) {
      stopPolling(true)
      return
    }

    logPollingStarted(PROGRESS_ENDPOINT)
    setMonitoring(true)
    pollOnce().then((nextProgress) => {
      if (
        mountedRef.current &&
        nextProgress &&
        !shouldStopEnvironmentPolling(nextProgress, environmentsRef.current)
      ) {
        schedulePoll()
      }
    })
  }, [pollOnce, schedulePoll, stopPolling])

  const startGeneration = useCallback(async () => {
    if (!projectId || starting) return

    setStarting(true)
    generationStartedRef.current = true
    resetGenerationStuckTracker(stuckTrackerRef.current)

    try {
      const nextProgress = await startEnvironmentGeneration(projectId, { style: visualStyle })
      if (!mountedRef.current) return

      applyProgressReadOnly(nextProgress)

      if (shouldStopEnvironmentPolling(nextProgress, environmentsRef.current)) {
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
      reportError(err, 'Failed to start environment generation')
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
    visualStyle,
  ])

  const retryEnvironment = useCallback(
    async (environmentId) => {
      if (!projectId || !environmentId) return

      generationStartedRef.current = true
      resetGenerationStuckTracker(stuckTrackerRef.current)

      try {
        const nextProgress = await retryEnvironmentGeneration(projectId, environmentId)
        if (!mountedRef.current) return

        applyProgressReadOnly(nextProgress)
        setIsStuck(false)

        if (shouldStopEnvironmentPolling(nextProgress, environmentsRef.current)) {
          await finalizeTerminalProgress(nextProgress)
          return
        }

        schedulePoll()
      } catch (err) {
        reportError(err, 'Failed to retry environment generation')
      }
    },
    [applyProgressReadOnly, finalizeTerminalProgress, projectId, reportError, schedulePoll]
  )

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

      const loadedEnvironments = environmentsRef.current
      const status = initialStatus

      if (
        hasProjectEnvironments(loadedEnvironments) &&
        areEnvironmentsGenerationSettled(loadedEnvironments)
      ) {
        publishCompletedProgress(loadedEnvironments, null)
        stopPolling(true)
        setIsStuck(false)
        return
      }

      if (shouldStopEnvironmentPolling({ status }, loadedEnvironments)) {
        publishCompletedProgress(loadedEnvironments, null)
        stopPolling(true)
        setIsStuck(false)
        return
      }

      if (hasProjectEnvironments(loadedEnvironments)) {
        generationStartedRef.current = true

        if (isGenerationInProgress(status)) {
          beginMonitoring()
        } else if (isGenerationTerminal(status)) {
          try {
            const nextProgress = await getEnvironmentGenerationProgress(projectId)
            if (!cancelled && mountedRef.current) {
              applyProgressReadOnly(nextProgress)
              if (!shouldStopEnvironmentPolling(nextProgress, environmentsRef.current)) {
                beginMonitoring()
              } else {
                stopPolling(true)
              }
            }
          } catch (err) {
            if (!cancelled && mountedRef.current) {
              reportError(err, 'Failed to load environment generation progress')
            }
          }
        }
        return
      }

      if (isGenerationInProgress(status)) {
        generationStartedRef.current = true
        beginMonitoring()
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
    publishCompletedProgress,
    reportError,
    stopPolling,
  ])

  const handleResumeGeneration = useCallback(
    async (retryFailed = false) => {
      if (!projectId || resuming) return

      setResuming(retryFailed ? 'retry_failed' : 'resume')
      try {
        const nextProgress = await resumeEnvironmentGeneration(projectId, {
          retry_failed: retryFailed,
        })
        if (!mountedRef.current) return

        resetGenerationStuckTracker(stuckTrackerRef.current)
        applyProgressReadOnly(nextProgress)
        setIsStuck(false)
        generationStartedRef.current = true

        if (shouldStopEnvironmentPolling(nextProgress, environmentsRef.current)) {
          await finalizeTerminalProgress(nextProgress)
          return
        }

        schedulePoll()
      } catch (err) {
        reportError(err, 'Failed to resume environment generation')
      } finally {
        if (mountedRef.current) {
          setResuming(null)
        }
      }
    },
    [
      applyProgressReadOnly,
      finalizeTerminalProgress,
      projectId,
      reportError,
      resuming,
      schedulePoll,
    ]
  )

  return {
    progress,
    monitoring,
    isStuck,
    resuming,
    starting,
    startGeneration,
    retryEnvironment,
    handleResumeGeneration,
  }
}
