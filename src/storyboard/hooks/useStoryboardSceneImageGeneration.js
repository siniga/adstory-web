import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelStoryboardSceneShotImageGeneration,
  getStoryboardSceneShotImageProgress,
  resumeStoryboardSceneShotImageGeneration,
  startStoryboardSceneShotImageGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import { logPollingStarted } from '../../creation/generationPolling'
import {
  areAllSceneShotImagesDone,
  areSceneShotImagesSettled,
  filterShotsForScene,
  getStoryboardShotImageStatus,
  isStoryboardShotImageGenerationActive,
  shouldResumeStoryboardImagePolling,
  shouldStopStoryboardShotImagePolling,
} from '../storyboardWorkspaceStatus'

const POLL_INTERVAL_MS = 2000
const SLOW_PROGRESS_MS = 20000
const PROGRESS_ENDPOINT = 'GET /storyboard/scenes/{scene}/shot-images/progress'

function logStoryboardPollingStopped() {
  console.log('[Storyboard] polling stopped')
}

function logStoryboardStalledDetected() {
  console.log('[Storyboard] stalled detected')
}

function logStoryboardGenerationResumed() {
  console.log('[Storyboard] generation resumed')
}

function logStoryboardCompletedShot(completed, total) {
  console.log('[Storyboard] completed shot', { completed, total })
}

function logStoryboardPollingSkipped(reason) {
  console.log('[Storyboard] polling skipped', reason)
}

function getSceneShotsForCheck(sceneId, shotsList) {
  const sceneShots = filterShotsForScene(shotsList, sceneId)
  return sceneShots.length ? sceneShots : shotsList
}

function logIgnoredStalePollResponse(requestSceneId, activeSceneId) {
  console.log('[Storyboard] ignored stale poll response', {
    requestSceneId,
    activeSceneId,
  })
}

export default function useStoryboardSceneImageGeneration({
  projectId,
  sceneId,
  shots = [],
  sceneLoading = false,
  onProgressChange,
  onShotsPatch,
  onComplete,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [starting, setStarting] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [generationError, setGenerationError] = useState(null)
  const [generationComplete, setGenerationComplete] = useState(false)
  const [stalled, setStalled] = useState(false)
  const [slowProgress, setSlowProgress] = useState(false)

  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const activeSceneIdRef = useRef(sceneId)
  const settledSceneIdsRef = useRef(new Set())
  const shotsRef = useRef(shots)
  const progressRef = useRef(null)
  const lastCompletedRef = useRef(0)
  const lastCompletedChangeRef = useRef(Date.now())

  useEffect(() => {
    activeSceneIdRef.current = sceneId
  }, [sceneId])

  useEffect(() => {
    shotsRef.current = shots
  }, [shots])

  useEffect(() => {
    progressRef.current = progress
  }, [progress])

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

  useEffect(() => {
    if (!monitoring || stalled) {
      setSlowProgress(false)
      return undefined
    }

    const intervalId = setInterval(() => {
      const current = progressRef.current
      if (!current || (current.remaining ?? 0) <= 0) {
        setSlowProgress(false)
        return
      }
      if (Date.now() - lastCompletedChangeRef.current >= SLOW_PROGRESS_MS) {
        setSlowProgress(true)
      }
    }, 1000)

    return () => clearInterval(intervalId)
  }, [monitoring, stalled])

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

  const trackCompletedProgress = useCallback((completed) => {
    const nextCompleted = completed ?? 0
    if (nextCompleted > lastCompletedRef.current) {
      logStoryboardCompletedShot(nextCompleted, progressRef.current?.total ?? 0)
      lastCompletedRef.current = nextCompleted
      lastCompletedChangeRef.current = Date.now()
      setSlowProgress(false)
    }
  }, [])

  const stopPollingIfShotsAlreadyDone = useCallback(
    (requestSceneId, apiProgress = null) => {
      // Local shot URLs can lag behind or persist from a prior run — trust API while work remains.
      if (apiProgress && !shouldStopStoryboardShotImagePolling(apiProgress)) {
        return false
      }

      const shotsForScene = getSceneShotsForCheck(requestSceneId, shotsRef.current)
      if (!areAllSceneShotImagesDone(shotsForScene)) return false

      logStoryboardPollingSkipped('all scene shots already generated')
      stopPolling(true)
      setStalled(false)
      setSlowProgress(false)
      setGenerationComplete(true)
      if (requestSceneId != null) {
        settledSceneIdsRef.current.add(String(requestSceneId))
      }
      return true
    },
    [stopPolling]
  )

  const applyProgressPayload = useCallback(
    (raw, requestSceneId) => {
      if (isStaleSceneResponse(requestSceneId)) {
        return { progress: null, isComplete: false, failed: false, stale: true, stalled: false }
      }

      const nextProgress = {
        status: raw.status ?? null,
        total: raw.total ?? 0,
        completed: raw.completed ?? 0,
        failed: raw.failed ?? 0,
        remaining: raw.remaining ?? 0,
        progress_percent: raw.progress_percent ?? null,
        stalled: Boolean(raw.stalled),
        estimated_remaining: raw.estimated_remaining ?? null,
        currentShot: raw.currentShot ?? null,
      }

      trackCompletedProgress(nextProgress.completed)

      setProgress(nextProgress)
      onProgressChange?.(nextProgress)

      if (raw.shots?.length) {
        onShotsPatch?.(raw.shots)
      }

      if (stopPollingIfShotsAlreadyDone(requestSceneId, nextProgress)) {
        return {
          progress: nextProgress,
          isComplete: true,
          failed: false,
          stale: false,
          stalled: false,
        }
      }

      if (nextProgress.stalled && !shouldStopStoryboardShotImagePolling(nextProgress)) {
        logStoryboardStalledDetected()
        setStalled(true)
        setSlowProgress(false)
        stopPolling(true)
        return {
          progress: nextProgress,
          isComplete: false,
          failed: false,
          stale: false,
          stalled: true,
        }
      }

      const isComplete = shouldStopStoryboardShotImagePolling(nextProgress)
      if (isComplete) {
        setStalled(false)
        setSlowProgress(false)
        setGenerationComplete(true)
        if (requestSceneId != null) {
          settledSceneIdsRef.current.add(String(requestSceneId))
        }
      }

      return {
        progress: nextProgress,
        isComplete,
        failed: raw.status === 'failed',
        stale: false,
        stalled: false,
      }
    },
    [isStaleSceneResponse, onProgressChange, onShotsPatch, stopPolling, stopPollingIfShotsAlreadyDone, trackCompletedProgress]
  )

  const pollOnce = useCallback(async () => {
    const requestSceneId = sceneId
    if (!projectId || !requestSceneId || !mountedRef.current) return { stopped: true }

    try {
      const raw = await getStoryboardSceneShotImageProgress(projectId, requestSceneId)
      if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) {
        return { stopped: true }
      }

      const result = applyProgressPayload(raw, requestSceneId)
      const { isComplete, failed, stale, stalled: isStalled } = result
      if (stale || isStalled) return { stopped: true }

      if (stopPollingIfShotsAlreadyDone(requestSceneId, result.progress)) {
        return { stopped: true }
      }

      if (isComplete) {
        stopPolling(true)
        if (failed) {
          setGenerationError('Scene image generation failed.')
        } else {
          setGenerationError(null)
          await onComplete?.(requestSceneId)
        }
        return { stopped: true }
      }

      return { stopped: false }
    } catch (err) {
      if (mountedRef.current && !isStaleSceneResponse(requestSceneId)) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to load image generation progress'
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
    onComplete,
    onError,
    projectId,
    sceneId,
    stopPolling,
    stopPollingIfShotsAlreadyDone,
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

  const beginPollingAfterStart = useCallback(() => {
    lastCompletedRef.current = progressRef.current?.completed ?? 0
    lastCompletedChangeRef.current = Date.now()
    setStalled(false)
    setSlowProgress(false)
    logPollingStarted(PROGRESS_ENDPOINT)
    schedulePoll()
  }, [schedulePoll])

  useEffect(() => {
    setProgress(null)
    setGenerationError(null)
    setGenerationComplete(false)
    setStalled(false)
    setSlowProgress(false)
    lastCompletedRef.current = 0
    lastCompletedChangeRef.current = Date.now()
    stopPolling()

    if (!projectId || !sceneId || sceneLoading) return undefined

    const requestSceneId = sceneId
    const sceneKey = String(sceneId)
    const shotsForScene = getSceneShotsForCheck(sceneId, shotsRef.current)

    if (areAllSceneShotImagesDone(shotsForScene)) {
      logStoryboardPollingSkipped('scene shots already generated on open')
      setGenerationComplete(true)
      settledSceneIdsRef.current.add(sceneKey)
      return undefined
    }

    if (settledSceneIdsRef.current.has(sceneKey) && areSceneShotImagesSettled(shotsForScene)) {
      setGenerationComplete(true)
      return undefined
    }

    let cancelled = false

    getStoryboardSceneShotImageProgress(projectId, requestSceneId)
      .then((raw) => {
        if (cancelled || !mountedRef.current || isStaleSceneResponse(requestSceneId)) return

        const shotsAfterOpen = getSceneShotsForCheck(requestSceneId, shotsRef.current)
        if (areAllSceneShotImagesDone(shotsAfterOpen)) {
          setGenerationComplete(true)
          settledSceneIdsRef.current.add(sceneKey)
          return
        }

        const { isComplete, stale, stalled: isStalled } = applyProgressPayload(raw, requestSceneId)
        if (stale) return

        if (isStalled) return

        if (
          !isComplete &&
          shouldResumeStoryboardImagePolling(raw, getSceneShotsForCheck(requestSceneId, shotsRef.current))
        ) {
          beginPollingAfterStart()
        } else if (isComplete) {
          setGenerationComplete(true)
          settledSceneIdsRef.current.add(sceneKey)
        } else if (raw.stalled) {
          setStalled(true)
        }
      })
      .catch(() => {
        // Scene may never have started image generation — ignore resume errors.
      })

    return () => {
      cancelled = true
      stopPolling()
    }
  }, [
    applyProgressPayload,
    beginPollingAfterStart,
    isStaleSceneResponse,
    projectId,
    sceneId,
    sceneLoading,
    stopPolling,
  ])

  const startGeneration = useCallback(async () => {
    const requestSceneId = sceneId
    if (!projectId || !requestSceneId || starting || monitoring) return

    settledSceneIdsRef.current.delete(String(requestSceneId))
    setStarting(true)
    setGenerationError(null)
    setGenerationComplete(false)
    setStalled(false)
    setSlowProgress(false)

    try {
      const raw = await startStoryboardSceneShotImageGeneration(projectId, requestSceneId)
      if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) return

      const { isComplete, failed, stale, stalled: isStalled } = applyProgressPayload(
        raw,
        requestSceneId
      )
      if (stale || isStalled) return

      if (isComplete) {
        stopPolling(true)
        if (failed) {
          setGenerationError('Scene image generation failed.')
        } else {
          await onComplete?.(requestSceneId)
        }
        return
      }

      beginPollingAfterStart()
    } catch (err) {
      if (!isStaleSceneResponse(requestSceneId)) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to start scene image generation'
        )
        setGenerationError(formatted.message)
        onError?.(formatted)
      }
    } finally {
      if (mountedRef.current) {
        setStarting(false)
      }
    }
  }, [
    applyProgressPayload,
    beginPollingAfterStart,
    isStaleSceneResponse,
    monitoring,
    onComplete,
    onError,
    projectId,
    sceneId,
    starting,
    stopPolling,
  ])

  const resumeGeneration = useCallback(async () => {
    const requestSceneId = sceneId
    if (!projectId || !requestSceneId || resuming) return

    settledSceneIdsRef.current.delete(String(requestSceneId))
    setResuming(true)
    setGenerationError(null)
    setGenerationComplete(false)
    setStalled(false)
    setSlowProgress(false)

    try {
      const raw = await resumeStoryboardSceneShotImageGeneration(projectId, requestSceneId)
      if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) return

      logStoryboardGenerationResumed()

      const { isComplete, failed, stale, stalled: isStalled } = applyProgressPayload(
        raw,
        requestSceneId
      )
      if (stale || isStalled) return

      if (isComplete) {
        stopPolling(true)
        if (failed) {
          setGenerationError('Scene image generation failed.')
        } else {
          await onComplete?.(requestSceneId)
        }
        return
      }

      beginPollingAfterStart()
    } catch (err) {
      if (!isStaleSceneResponse(requestSceneId)) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to resume scene image generation'
        )
        setGenerationError(formatted.message)
        onError?.(formatted)
      }
    } finally {
      if (mountedRef.current) {
        setResuming(false)
      }
    }
  }, [
    applyProgressPayload,
    beginPollingAfterStart,
    isStaleSceneResponse,
    onComplete,
    onError,
    projectId,
    resuming,
    sceneId,
    stopPolling,
  ])

  const dismissSlowProgress = useCallback(() => {
    lastCompletedChangeRef.current = Date.now()
    setSlowProgress(false)
  }, [])

  const cancelGeneration = useCallback(async () => {
    const requestSceneId = sceneId
    if (!projectId || !requestSceneId || cancelling) return

    stopPolling(true)
    setCancelling(true)
    setStalled(false)
    setSlowProgress(false)
    setGenerationError(null)

    try {
      const raw = await cancelStoryboardSceneShotImageGeneration(projectId, requestSceneId)
      if (!mountedRef.current || isStaleSceneResponse(requestSceneId)) return

      applyProgressPayload(raw, requestSceneId)
      setGenerationComplete(false)
      settledSceneIdsRef.current.delete(String(requestSceneId))
    } catch (err) {
      if (!isStaleSceneResponse(requestSceneId)) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to cancel image generation'
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

  const imageGenerationActive =
    !stalled &&
    !generationComplete &&
    (starting ||
      resuming ||
      cancelling ||
      monitoring ||
      isStoryboardShotImageGenerationActive(progress))

  return {
    progress,
    monitoring,
    starting,
    resuming,
    generationError,
    generationComplete,
    stalled,
    slowProgress,
    imageGenerationActive,
    startGeneration,
    resumeGeneration,
    cancelGeneration,
    cancelling,
    dismissSlowProgress,
    stopPolling,
  }
}
