import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getSceneShotGenerationProgress,
  startSceneShotGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  isGenerationInProgress,
  normalizeGenerationProgress,
  resetGenerationStuckTracker,
} from '../aiGenerationStatus'
import {
  isSceneShotGenerationActive,
  isSceneShotGenerationFailed,
  mapSceneShotProgress,
  mergeSceneInList,
  mergeScenePreservingShotMeta,
  mergeSceneboardShots,
  shouldStopSceneShotPolling,
} from '../sceneboardStatus'

const POLL_INTERVAL_MS = 2000

function applyQueuedScene(scene) {
  if (!scene) return null
  return mergeScenePreservingShotMeta(
    { ...scene, shotGenerationStatus: 'queued' },
    scene
  )
}

export default function useSceneShotGeneration({
  projectId,
  sceneId,
  scene,
  visualStyle = '',
  enabled = false,
  shots = [],
  scenes = [],
  onSceneChange,
  onShotsChange,
  onScenesListChange,
  onGenerationComplete,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [starting, setStarting] = useState(false)
  const [generationError, setGenerationError] = useState(null)

  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const sceneRef = useRef(scene)
  const shotsRef = useRef(shots)
  const scenesRef = useRef(scenes)
  const completeLoadPromiseRef = useRef(null)

  useEffect(() => {
    sceneRef.current = scene
  }, [scene])

  useEffect(() => {
    shotsRef.current = shots
  }, [shots])

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

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

  const publishSceneUpdate = useCallback(
    (nextScene) => {
      if (!nextScene) return
      onSceneChange?.(nextScene)
      onScenesListChange?.(mergeSceneInList(scenesRef.current, nextScene))
    },
    [onSceneChange, onScenesListChange]
  )

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setMonitoring(false)
  }, [])

  const applyProgressPayload = useCallback(
    (raw) => {
      const mapped = mapSceneShotProgress(raw, sceneRef.current)
      const isComplete = shouldStopSceneShotPolling(raw, mapped.scene ?? sceneRef.current)
      const normalized = normalizeGenerationProgress(mapped, { isComplete })
      setProgress(normalized)

      if (raw.scene) {
        const mergedScene = mergeScenePreservingShotMeta(raw.scene, sceneRef.current)
        publishSceneUpdate(mergedScene)
      }

      if (raw.shots?.length) {
        const merged = mergeSceneboardShots(shotsRef.current, raw.shots)
        onShotsChange?.(merged)
      }

      return { normalized, isComplete, failed: isSceneShotGenerationFailed(raw.scene ?? sceneRef.current) }
    },
    [onShotsChange, publishSceneUpdate]
  )

  const finalizeTerminalProgress = useCallback(
    async (raw) => {
      const sceneSnapshot = raw.scene ?? sceneRef.current
      if (isSceneShotGenerationFailed(sceneSnapshot)) {
        const message =
          sceneSnapshot?.shotGenerationError ??
          'Shot generation failed. Try again.'
        setGenerationError(message)
        return
      }

      if (completeLoadPromiseRef.current) {
        await completeLoadPromiseRef.current
        return
      }

      completeLoadPromiseRef.current = (async () => {
        try {
          await onGenerationComplete?.()
        } finally {
          completeLoadPromiseRef.current = null
        }
      })()

      await completeLoadPromiseRef.current
    },
    [onGenerationComplete]
  )

  const pollOnce = useCallback(async () => {
    if (!projectId || !sceneId || !mountedRef.current) return { stopped: true }

    try {
      const raw = await getSceneShotGenerationProgress(projectId, sceneId)
      if (!mountedRef.current) return { stopped: true }

      const { isComplete, failed } = applyProgressPayload(raw)

      if (isComplete) {
        stopPolling()
        if (failed) {
          setGenerationError(
            raw.scene?.shotGenerationError ?? 'Shot generation failed. Try again.'
          )
        } else {
          setGenerationError(null)
          await finalizeTerminalProgress(raw)
        }
        return { stopped: true }
      }

      return { stopped: false }
    } catch (err) {
      if (mountedRef.current) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to load shot progress'
        )
        setGenerationError(formatted.message)
        onError?.(formatted)
        stopPolling()
      }
      return { stopped: true }
    }
  }, [
    applyProgressPayload,
    finalizeTerminalProgress,
    onError,
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

  const beginMonitoring = useCallback(() => {
    if (shouldStopSceneShotPolling(null, sceneRef.current)) return

    setMonitoring(true)
    pollOnce().then((result) => {
      if (mountedRef.current && result && !result.stopped) {
        schedulePoll()
      }
    })
  }, [pollOnce, schedulePoll])

  const startGeneration = useCallback(
    async ({ force = false } = {}) => {
      if (!projectId || !sceneId || starting) return

      setStarting(true)
      setGenerationError(null)
      resetGenerationStuckTracker({ lastSnapshot: null, lastChangedAt: Date.now() })

      const optimisticScene = applyQueuedScene(sceneRef.current)
      if (optimisticScene) {
        publishSceneUpdate(optimisticScene)
      }

      try {
        const raw = await startSceneShotGeneration(projectId, sceneId, {
          style: visualStyle,
          force,
        })
        if (!mountedRef.current) return

        const { isComplete, failed } = applyProgressPayload(raw)

        if (isComplete) {
          stopPolling()
          if (failed) {
            setGenerationError(
              raw.scene?.shotGenerationError ?? 'Shot generation failed. Try again.'
            )
          } else {
            await finalizeTerminalProgress(raw)
          }
          return
        }

        schedulePoll()
      } catch (err) {
        const formatted = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to start shot generation'
        )
        setGenerationError(formatted.message)
        onError?.(formatted)
      } finally {
        if (mountedRef.current) {
          setStarting(false)
        }
      }
    },
    [
      applyProgressPayload,
      finalizeTerminalProgress,
      onError,
      projectId,
      publishSceneUpdate,
      sceneId,
      schedulePoll,
      starting,
      stopPolling,
      visualStyle,
    ]
  )

  useEffect(() => {
    if (!enabled || !projectId || !sceneId) {
      stopPolling()
      return undefined
    }

    if (isSceneShotGenerationActive(scene)) {
      beginMonitoring()
    }

    return () => stopPolling()
  }, [beginMonitoring, enabled, projectId, scene, sceneId, stopPolling])

  return {
    progress,
    monitoring,
    starting,
    generationError,
    startGeneration,
    beginMonitoring,
    stopPolling,
  }
}
