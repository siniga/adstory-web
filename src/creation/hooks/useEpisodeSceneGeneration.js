import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getEpisodeSceneGenerationProgress,
  startEpisodeSceneGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  isGenerationInProgress,
  normalizeGenerationProgress,
  resetGenerationStuckTracker,
} from '../aiGenerationStatus'
import {
  isEpisodeSceneGenerationActive,
  mapAdstoryEpisode,
  mapEpisodeSceneProgress,
  shouldStopEpisodeScenePolling,
} from '../episodeGenerationStatus'

const POLL_INTERVAL_MS = 2000

export default function useEpisodeSceneGeneration({
  projectId,
  episodeId,
  episode,
  visualStyle = '',
  enabled = false,
  onEpisodeChange,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [starting, setStarting] = useState(false)

  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const generationStartedRef = useRef(false)
  const episodeRef = useRef(episode)

  useEffect(() => {
    episodeRef.current = episode
  }, [episode])

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
    generationStartedRef.current = false
  }, [episodeId, projectId])

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setMonitoring(false)
  }, [])

  const publishProgress = useCallback(
    (rawProgress) => {
      const mapped = mapEpisodeSceneProgress(rawProgress, episodeRef.current)
      const normalized = normalizeGenerationProgress(mapped, {
        isComplete: shouldStopEpisodeScenePolling(rawProgress, mapped.episode),
      })
      setProgress(normalized)

      if (mapped.episode) {
        onEpisodeChange?.(mapAdstoryEpisode(mapped.episode))
      }
      return normalized
    },
    [onEpisodeChange]
  )

  const pollOnce = useCallback(async () => {
    if (!projectId || !episodeId || !mountedRef.current) return null

    try {
      const raw = await getEpisodeSceneGenerationProgress(projectId, episodeId)
      if (!mountedRef.current) return null

      const normalized = publishProgress(raw)

      if (shouldStopEpisodeScenePolling(raw, normalized.episode)) {
        stopPolling()
      }

      return normalized
    } catch (err) {
      if (mountedRef.current) {
        onError?.(formatUserFriendlyError(err instanceof Error ? err.message : 'Failed to load progress'))
        stopPolling()
      }
      return null
    }
  }, [episodeId, onError, projectId, publishProgress, stopPolling])

  const schedulePoll = useCallback(() => {
    if (pollTimerRef.current) return

    setMonitoring(true)
    pollTimerRef.current = setTimeout(async () => {
      pollTimerRef.current = null
      const next = await pollOnce()
      if (mountedRef.current && next && isGenerationInProgress(next.status)) {
        schedulePoll()
      }
    }, POLL_INTERVAL_MS)
  }, [pollOnce])

  const beginMonitoring = useCallback(() => {
    if (shouldStopEpisodeScenePolling(null, episodeRef.current)) return

    setMonitoring(true)
    pollOnce().then((next) => {
      if (mountedRef.current && next && isGenerationInProgress(next.status)) {
        schedulePoll()
      }
    })
  }, [pollOnce, schedulePoll])

  const startGeneration = useCallback(
    async ({ force = false } = {}) => {
      if (!projectId || !episodeId || starting) return

      setStarting(true)
      generationStartedRef.current = true
      resetGenerationStuckTracker({ lastSnapshot: null, lastChangedAt: Date.now() })

      try {
        const raw = await startEpisodeSceneGeneration(projectId, episodeId, {
          style: visualStyle,
          force,
        })
        if (!mountedRef.current) return

        const normalized = publishProgress(raw)

        if (shouldStopEpisodeScenePolling(raw, normalized.episode)) {
          stopPolling()
          return
        }

        schedulePoll()
      } catch (err) {
        generationStartedRef.current = false
        onError?.(formatUserFriendlyError(err instanceof Error ? err.message : 'Failed to start generation'))
      } finally {
        if (mountedRef.current) {
          setStarting(false)
        }
      }
    },
    [episodeId, onError, projectId, publishProgress, schedulePoll, starting, stopPolling, visualStyle]
  )

  useEffect(() => {
    if (!enabled || !projectId || !episodeId) {
      stopPolling()
      return undefined
    }

    if (isEpisodeSceneGenerationActive(episode)) {
      beginMonitoring()
    }

    return () => stopPolling()
  }, [beginMonitoring, enabled, episode, episodeId, projectId, stopPolling])

  return {
    progress,
    monitoring,
    starting,
    startGeneration,
    beginMonitoring,
    stopPolling,
  }
}
