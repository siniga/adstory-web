import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getEpisodeShotGenerationProgress,
  startEpisodeShotGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  isGenerationInProgress,
  normalizeGenerationProgress,
  resetGenerationStuckTracker,
} from '../aiGenerationStatus'
import {
  isEpisodeShotGenerationActive,
  mapAdstoryEpisode,
  mapEpisodeShotProgress,
  shouldStopEpisodeShotPolling,
} from '../episodeGenerationStatus'

const POLL_INTERVAL_MS = 2000

export default function useEpisodeShotGeneration({
  projectId,
  episodeId,
  episode,
  visualStyle = '',
  enabled = false,
  scenes = [],
  onEpisodeChange,
  onScenesChange,
  onError,
}) {
  const [progress, setProgress] = useState(null)
  const [monitoring, setMonitoring] = useState(false)
  const [starting, setStarting] = useState(false)

  const pollTimerRef = useRef(null)
  const mountedRef = useRef(true)
  const episodeRef = useRef(episode)
  const scenesRef = useRef(scenes)

  useEffect(() => {
    episodeRef.current = episode
  }, [episode])

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

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
      pollTimerRef.current = null
    }
    setMonitoring(false)
  }, [])

  const publishProgress = useCallback(
    (rawProgress) => {
      const mapped = mapEpisodeShotProgress(rawProgress, episodeRef.current)
      const normalized = normalizeGenerationProgress(mapped, {
        isComplete: shouldStopEpisodeShotPolling(rawProgress, mapped.episode),
      })
      setProgress(normalized)

      if (mapped.episode) {
        onEpisodeChange?.(mapAdstoryEpisode(mapped.episode))
      }

      if (rawProgress.scenes?.length) {
        onScenesChange?.(rawProgress.scenes)
      }

      return normalized
    },
    [onEpisodeChange, onScenesChange]
  )

  const pollOnce = useCallback(async () => {
    if (!projectId || !episodeId || !mountedRef.current) return null

    try {
      const raw = await getEpisodeShotGenerationProgress(projectId, episodeId)
      if (!mountedRef.current) return null

      const normalized = publishProgress(raw)

      if (shouldStopEpisodeShotPolling(raw, normalized.episode)) {
        stopPolling()
      }

      return normalized
    } catch (err) {
      if (mountedRef.current) {
        onError?.(formatUserFriendlyError(err instanceof Error ? err.message : 'Failed to load shot progress'))
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
    if (shouldStopEpisodeShotPolling(null, episodeRef.current)) return

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
      resetGenerationStuckTracker({ lastSnapshot: null, lastChangedAt: Date.now() })

      try {
        const raw = await startEpisodeShotGeneration(projectId, episodeId, {
          style: visualStyle,
          force,
        })
        if (!mountedRef.current) return

        const normalized = publishProgress(raw)

        if (shouldStopEpisodeShotPolling(raw, normalized.episode)) {
          stopPolling()
          return
        }

        schedulePoll()
      } catch (err) {
        onError?.(formatUserFriendlyError(err instanceof Error ? err.message : 'Failed to start shot generation'))
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

    if (isEpisodeShotGenerationActive(episode)) {
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
