import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelStoryboardSceneShotGeneration,
  getStoryboardSceneShotProgress,
  startStoryboardSceneShotGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import { logPollingStarted } from '../../creation/generationPolling'
import {
  isStoryboardShotGenerationActive,
  shouldStopStoryboardShotPolling,
} from '../storyboardWorkspaceStatus'

const POLL_INTERVAL_MS = 2000
const PROGRESS_ENDPOINT = 'GET /storyboard/scenes/{scene}/shots/progress'

function logStoryboardPollingStopped() {
  console.log('[Storyboard] polling stopped')
}

function logIgnoredStalePollResponse(requestSceneId, activeSceneId) {
  console.log('[Storyboard] ignored stale poll response', {
    requestSceneId,
    activeSceneId,
  })
}

export default function useStoryboardShotGeneration({
  projectId,
  sceneId,
  visualStyle = '',
  onProgressChange,
  onSceneMetaChange,
  onShotsChange,
  onGenerationComplete,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [generationError, setGenerationError] = useState(null)

  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const activeSceneIdRef = useRef(sceneId)

  useEffect(() => {
    activeSceneIdRef.current = sceneId
  }, [sceneId])

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

  const isStaleSceneResponse = useCallback((requestSceneId) => {
    if (requestSceneId == null) return true
    if (String(requestSceneId) === String(activeSceneIdRef.current)) {
      return false
    }
    logIgnoredStalePollResponse(requestSceneId, activeSceneIdRef.current)
    return true
  }, [])

  const stopPolling = useCallback((reason = false) => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setMonitoring(false)
    if (reason) {
      logStoryboardPollingStopped()
    }
  }, [])

  useEffect(() => {
    setProgress(null)
    setGenerationError(null)
    stopPolling()
  }, [projectId, sceneId, stopPolling])

  const applyProgressPayload = useCallback(
    (raw, requestSceneId) => {
      if (isStaleSceneResponse(requestSceneId)) {
        return { progress: null, isComplete: false, failed: false, stale: true }
      }

      const nextProgress = {
        status: raw.status ?? null,
        total: raw.total ?? 0,
        completed: raw.completed ?? 0,
        failed: raw.failed ?? 0,
        remaining: raw.remaining ?? 0,
        progress_percent: raw.progress_percent ?? null,
        currentShot: raw.currentShot ?? null,
      }

      setProgress(nextProgress)
      onProgressChange?.(nextProgress)

      if (raw.scene) {
        onSceneMetaChange?.(raw.scene)
      }

      if (raw.shots?.length) {
        onShotsChange?.(raw.shots)
      }

      return {
        progress: nextProgress,
        isComplete: shouldStopStoryboardShotPolling({ status: raw.status }),
        failed: raw.status === 'failed',
        stale: false,
      }
    },
    [isStaleSceneResponse, onProgressChange, onSceneMetaChange, onShotsChange]
  )

  const pollOnce = useCallback(async () => {
    const requestSceneId = sceneId
    if (!projectId || !requestSceneId || !mountedRef.current) return { stopped: true }

    try {
      const raw = await getStoryboardSceneShotProgress(projectId, requestSceneId)
      if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) {
        return { stopped: true }
      }

      const { isComplete, failed, stale } = applyProgressPayload(raw, requestSceneId)
      if (stale) return { stopped: true }

      if (isComplete) {
        stopPolling(true)
        if (failed) {
          setGenerationError('Shot generation failed. Try again.')
        } else {
          setGenerationError(null)
          await onGenerationComplete?.(requestSceneId)
        }
        return { stopped: true }
      }

      return { stopped: false }
    } catch (err) {
      if (mountedRef.current && !isStaleSceneResponse(requestSceneId)) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to load shot progress'
        )
        setGenerationError(formatted.message)
        onError?.(formatted)
        stopPolling(true)
      }
      return { stopped: true }
    }
  }, [
    applyProgressPayload,
    isStaleSceneResponse,
    onError,
    onGenerationComplete,
    projectId,
    sceneId,
    stopPolling,
  ])

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) return

    setMonitoring(true)
    pollTimerRef.current = setTimeout(async () => {
      pollTimerRef.current = null
      const result = await pollOnce()
      if (mountedRef.current && result && !result.stopped) {
        schedulePoll()
      }
    }, POLL_INTERVAL_MS)
  }, [pollOnce])

  const startGeneration = useCallback(
    async ({ force = false } = {}) => {
      const requestSceneId = sceneId
      if (!projectId || !requestSceneId || starting) return

      setStarting(true)
      setGenerationError(null)

      try {
        const raw = await startStoryboardSceneShotGeneration(projectId, requestSceneId, {
          style: visualStyle,
          force,
        })
        if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) return

        const { isComplete, failed, stale } = applyProgressPayload(raw, requestSceneId)
        if (stale) return

        if (isComplete) {
          stopPolling(true)
          if (failed) {
            setGenerationError('Shot generation failed. Try again.')
          } else {
            await onGenerationComplete?.(requestSceneId)
          }
          return
        }

        if (isStoryboardShotGenerationActive(raw.status) || raw.startedGeneration) {
          logPollingStarted(PROGRESS_ENDPOINT)
          schedulePoll()
        }
      } catch (err) {
        if (!isStaleSceneResponse(requestSceneId)) {
          const formatted = formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to start shot generation'
          )
          setGenerationError(formatted.message)
          onError?.(formatted)
        }
      } finally {
        if (mountedRef.current) {
          setStarting(false)
        }
      }
    },
    [
      applyProgressPayload,
      isStaleSceneResponse,
      onError,
      onGenerationComplete,
      projectId,
      sceneId,
      schedulePoll,
      starting,
      stopPolling,
      visualStyle,
    ]
  )

  const cancelGeneration = useCallback(async () => {
    const requestSceneId = sceneId
    if (!projectId || !requestSceneId || cancelling) return

    stopPolling(true)
    setCancelling(true)
    setGenerationError(null)

    try {
      const raw = await cancelStoryboardSceneShotGeneration(projectId, requestSceneId)
      if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) return

      applyProgressPayload(raw, requestSceneId)
    } catch (err) {
      if (!isStaleSceneResponse(requestSceneId)) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to cancel shot generation'
        )
        setGenerationError(formatted.message)
        onError?.(formatted)
      }
    } finally {
      if (mountedRef.current) {
        setCancelling(false)
      }
    }
  }, [
    applyProgressPayload,
    cancelling,
    isStaleSceneResponse,
    onError,
    projectId,
    sceneId,
    stopPolling,
  ])

  return {
    progress,
    monitoring,
    starting,
    cancelling,
    generationError,
    startGeneration,
    cancelGeneration,
    stopPolling,
  }
}
