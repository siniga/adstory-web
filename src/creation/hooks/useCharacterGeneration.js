import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getCharacterGenerationProgress,
  mapAdstoryCharacters,
  startCharacterGeneration,
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
  allCharactersPortraitComplete,
  areCharactersGenerationSettled,
  hasProjectCharacters,
  logCharactersUpdate,
  mergeCharacterListsPreservingPortraits,
  normalizeCharacterGenerationProgress,
  normalizeCharacterList,
  shouldAutoStartCharacterGeneration,
  shouldStopCharacterPolling,
} from '../characterGenerationStatus'

import { logProjectStore } from '../../project/projectStoreHelpers'
import {
  logPollingStarted,
  logPollingStopped,
} from '../generationPolling'

const POLL_INTERVAL_MS = 2000
const PROGRESS_ENDPOINT = 'GET /characters/progress'

function applyProgressMeta(progress) {
  return {
    characterGenerationStatus: progress.status ?? null,
    characterGenerationTotal: progress.total ?? 0,
    characterGenerationCompleted: progress.completed ?? 0,
    characterGenerationFailed: progress.failed ?? 0,
    characterGenerationStartedAt:
      progress.project?.character_generation_started_at ?? progress.startedAt ?? null,
    characterGenerationFinishedAt:
      progress.project?.character_generation_finished_at ?? progress.finishedAt ?? null,
  }
}

function buildMetaFromProject(project = {}, progress = null) {
  if (!project || Object.keys(project).length === 0) {
    return applyProgressMeta(progress ?? {})
  }

  return {
    characterGenerationStatus:
      project.characterGenerationStatus ?? progress?.status ?? null,
    characterGenerationTotal:
      project.characterGenerationTotal ?? progress?.total ?? 0,
    characterGenerationCompleted:
      project.characterGenerationCompleted ?? progress?.completed ?? 0,
    characterGenerationFailed:
      project.characterGenerationFailed ?? progress?.failed ?? 0,
    characterGenerationStartedAt:
      project.characterGenerationStartedAt ??
      progress?.project?.character_generation_started_at ??
      null,
    characterGenerationFinishedAt:
      project.characterGenerationFinishedAt ??
      progress?.project?.character_generation_finished_at ??
      null,
    ...(project.aiTasksSummary != null ? { aiTasksSummary: project.aiTasksSummary } : {}),
  }
}

export default function useCharacterGeneration({
  enabled = false,
  projectId,
  initialStatus = null,
  initialStartedAt = null,
  visualStyle = '',
  characters = [],
  fallbackCharacters = [],
  loadProjectOnComplete,
  refreshFullProject,
  onCharactersChange,
  onGenerationMetaChange,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [isStuck, setIsStuck] = useState(false)
  const [resuming, setResuming] = useState(false)

  const charactersRef = useRef(characters)
  const fallbackCharactersRef = useRef(fallbackCharacters)
  const generationStartedRef = useRef(false)
  const initCompletedRef = useRef(false)
  const pollTimerRef = useRef(null)
  const stuckTrackerRef = useRef(createGenerationStuckTracker())
  const mountedRef = useRef(true)
  const terminalLoadPromiseRef = useRef(null)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    charactersRef.current = characters
  }, [characters])

  useEffect(() => {
    fallbackCharactersRef.current = fallbackCharacters
  }, [fallbackCharacters])

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
    setIsStuck(evaluateGenerationStuck(nextProgress, stuckTrackerRef.current))
  }, [])

  const applyBackendCharacters = useCallback(
    (backendCharacters, { source = 'applyBackendCharacters' } = {}) => {
      const normalized = normalizeCharacterList(backendCharacters)
      if (!normalized.length) {
        return charactersRef.current
      }

      const next = mergeCharacterListsPreservingPortraits(charactersRef.current, normalized)
      logCharactersUpdate(source, next)
      onCharactersChange?.(next)
      return next
    },
    [onCharactersChange]
  )

  const publishProgress = useCallback(
    (nextProgress, charactersForDisplay = charactersRef.current, refreshedProject = null) => {
      if (!nextProgress) return

      const normalized = normalizeCharacterGenerationProgress(nextProgress, charactersForDisplay)
      setProgress(normalized)
      updateStuckState(normalized)

      const meta = refreshedProject
        ? buildMetaFromProject(refreshedProject, normalized)
        : applyProgressMeta({
            ...normalized,
            startedAt: initialStartedAt,
            finishedAt: normalized.project?.character_generation_finished_at ?? null,
          })

      onGenerationMetaChange?.(meta)
    },
    [initialStartedAt, onGenerationMetaChange, updateStuckState]
  )

  const publishCompletedProgress = useCallback(
    (charactersForDisplay, refreshedProject = null) => {
      const total = charactersForDisplay.length
      publishProgress(
        normalizeCharacterGenerationProgress(
          {
            status: 'completed',
            total,
            completed: total,
            failed: 0,
            phase: 'images',
          },
          charactersForDisplay
        ),
        charactersForDisplay,
        refreshedProject
      )
      setIsStuck(false)
    },
    [publishProgress]
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

  const progressCharactersFromResponse = useCallback((nextProgress) => {
    if (nextProgress?.characters?.length) {
      return mapAdstoryCharacters(nextProgress.characters)
    }
    return []
  }, [])

  useEffect(() => {
    if (!enabled || !hasProjectCharacters(characters)) return

    if (areCharactersGenerationSettled(characters)) {
      stopPolling(true)
      setIsStuck(false)
      if (!isGenerationTerminal(progress?.status)) {
        publishCompletedProgress(characters, null)
      }
    }
  }, [characters, enabled, progress?.status, publishCompletedProgress, stopPolling])

  const loadTerminalProjectState = useCallback(
    async (nextProgress) => {
      if (terminalLoadPromiseRef.current) {
        return terminalLoadPromiseRef.current
      }

      const completeLoad = loadProjectOnComplete ?? refreshFullProject

      terminalLoadPromiseRef.current = (async () => {
        let refreshedProject = null
        let loadedCharacters = charactersRef.current

        if (completeLoad) {
          logProjectStore('full loaded once', 'characters generation complete')
          refreshedProject = await completeLoad()
          loadedCharacters = normalizeCharacterList(
            refreshedProject?.characters ?? charactersRef.current
          )
          console.log('[Characters] ProjectStore after terminal load', loadedCharacters.length)
        } else {
          const progressCharacters = progressCharactersFromResponse(nextProgress)
          if (progressCharacters.length) {
            loadedCharacters = applyBackendCharacters(progressCharacters, {
              source: 'useCharacterGeneration GET /characters/progress (terminal)',
            })
          }
        }

        publishProgress(nextProgress, loadedCharacters, refreshedProject)
        if (areCharactersGenerationSettled(loadedCharacters)) {
          publishCompletedProgress(loadedCharacters, refreshedProject)
        }

        return loadedCharacters
      })()

      try {
        return await terminalLoadPromiseRef.current
      } finally {
        terminalLoadPromiseRef.current = null
      }
    },
    [
      applyBackendCharacters,
      loadProjectOnComplete,
      progressCharactersFromResponse,
      publishCompletedProgress,
      publishProgress,
      refreshFullProject,
    ]
  )

  const applyProgressReadOnly = useCallback(
    (nextProgress) => {
      if (!nextProgress) return charactersRef.current

      const progressCharacters = progressCharactersFromResponse(nextProgress)
      const loadedCharacters = progressCharacters.length
        ? applyBackendCharacters(progressCharacters, {
            source: 'useCharacterGeneration GET /characters/progress (poll)',
          })
        : charactersRef.current

      publishProgress(nextProgress, loadedCharacters)
      return loadedCharacters
    },
    [applyBackendCharacters, progressCharactersFromResponse, publishProgress]
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

    if (shouldStopCharacterPolling(null, charactersRef.current)) {
      stopPolling(true)
      return null
    }

    try {
      const nextProgress = await getCharacterGenerationProgress(projectId)
      if (!mountedRef.current) return null

      const loadedCharacters = applyProgressReadOnly(nextProgress)

      if (shouldStopCharacterPolling(nextProgress, loadedCharacters)) {
        if (isGenerationTerminal(nextProgress.status)) {
          await finalizeTerminalProgress(nextProgress)
        } else {
          publishCompletedProgress(loadedCharacters, null)
          stopPolling(true)
        }
        return nextProgress
      }

      return nextProgress
    } catch (err) {
      if (mountedRef.current) {
        reportError(err, 'Failed to load character generation progress')
        stopPolling()
      }
      return null
    }
  }, [
    applyProgressReadOnly,
    finalizeTerminalProgress,
    projectId,
    publishCompletedProgress,
    reportError,
    stopPolling,
  ])

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) return
    if (shouldStopCharacterPolling(null, charactersRef.current)) {
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
        !shouldStopCharacterPolling(nextProgress, charactersRef.current)
      ) {
        schedulePoll()
      }
    }, POLL_INTERVAL_MS)
  }, [pollOnce, stopPolling])

  const beginMonitoring = useCallback(() => {
    if (shouldStopCharacterPolling(null, charactersRef.current)) {
      stopPolling(true)
      return
    }

    logPollingStarted(PROGRESS_ENDPOINT)
    setMonitoring(true)
    pollOnce().then((nextProgress) => {
      if (
        mountedRef.current &&
        nextProgress &&
        !shouldStopCharacterPolling(nextProgress, charactersRef.current)
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
      const nextProgress = await startCharacterGeneration(projectId, { style: visualStyle })
      if (!mountedRef.current) return

      applyProgressReadOnly(nextProgress)

      if (shouldStopCharacterPolling(nextProgress, charactersRef.current)) {
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
      reportError(err, 'Failed to start character generation')
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

      const loadedCharacters = charactersRef.current
      const status = initialStatus

      if (
        shouldStopCharacterPolling({ status }, loadedCharacters) ||
        allCharactersPortraitComplete(loadedCharacters)
      ) {
        publishCompletedProgress(loadedCharacters, null)
        stopPolling(true)
        return
      }

      if (hasProjectCharacters(loadedCharacters)) {
        generationStartedRef.current = true

        if (isGenerationInProgress(status)) {
          beginMonitoring()
        } else if (isGenerationTerminal(status)) {
          try {
            const nextProgress = await getCharacterGenerationProgress(projectId)
            if (!cancelled && mountedRef.current) {
              applyProgressReadOnly(nextProgress)
              if (!shouldStopCharacterPolling(nextProgress, charactersRef.current)) {
                beginMonitoring()
              } else {
                stopPolling(true)
              }
            }
          } catch (err) {
            if (!cancelled && mountedRef.current) {
              reportError(err, 'Failed to load character generation progress')
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

      if (shouldAutoStartCharacterGeneration(status, { characters: loadedCharacters })) {
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
    publishCompletedProgress,
    reportError,
    startGeneration,
    stopPolling,
  ])

  const handleResumeGeneration = useCallback(async () => {
    if (!projectId || resuming) return

    setResuming(true)
    try {
      const nextProgress = await startCharacterGeneration(projectId, { style: visualStyle })
      if (!mountedRef.current) return

      resetGenerationStuckTracker(stuckTrackerRef.current)
      applyProgressReadOnly(nextProgress)
      setIsStuck(false)
      generationStartedRef.current = true

      if (shouldStopCharacterPolling(nextProgress, charactersRef.current)) {
        await finalizeTerminalProgress(nextProgress)
        return
      }

      schedulePoll()
    } catch (err) {
      reportError(err, 'Failed to resume character generation')
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
