import { useCallback, useEffect, useRef, useState } from 'react'
import { getSceneGenerationProgress, startSceneGeneration } from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  isSceneGenerationBlank,
  isSceneGenerationInProgress,
  isSceneGenerationTerminal,
  shouldAutoStartSceneGeneration,
} from '../sceneGenerationStatus'
import { areSceneboardScenesGenerationSettled } from '../sceneboardStatus'
import {
  GENERATION_TYPES,
  useProjectGenerationSlice,
} from '../projectGeneration/ProjectGenerationProvider'

const sceneStartInflight = new Map()

/**
 * Sceneboard generation: start + display only.
 * ProjectGenerationProvider owns all polling / progress merge.
 */
export default function useSceneboardSceneGeneration({
  enabled = false,
  projectId,
  screenplay = '',
  initialStatus = null,
  scenes = [],
  onError,
}) {
  const coordinator = useProjectGenerationSlice(GENERATION_TYPES.SCENES)

  const [starting, setStarting] = useState(false)
  const generationStartedRef = useRef(false)
  const initializedForRef = useRef(null)
  const mountedRef = useRef(true)
  const projectIdRef = useRef(projectId)
  const startingRef = useRef(false)
  const scenesRef = useRef(scenes)

  useEffect(() => {
    scenesRef.current = scenes
  }, [scenes])

  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      projectIdRef.current = projectId
      generationStartedRef.current = false
      initializedForRef.current = null
    }
  }, [projectId])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const reportError = useCallback(
    (err, fallback) => {
      onError?.(formatUserFriendlyError(err instanceof Error ? err.message : fallback))
    },
    [onError]
  )

  const handOffToCoordinator = useCallback(
    (nextProgress) => {
      if (!coordinator || !nextProgress) return
      coordinator.publishProgress(nextProgress)
    },
    [coordinator]
  )

  const startGeneration = useCallback(async () => {
    if (!projectId || !coordinator || generationStartedRef.current || startingRef.current) {
      return false
    }

    startingRef.current = true
    setStarting(true)
    generationStartedRef.current = true

    try {
      let startPromise = sceneStartInflight.get(String(projectId))
      if (!startPromise) {
        startPromise = startSceneGeneration(projectId).finally(() => {
          sceneStartInflight.delete(String(projectId))
        })
        sceneStartInflight.set(String(projectId), startPromise)
      }

      const nextProgress = await startPromise
      if (!mountedRef.current) return true

      if (isSceneGenerationBlank(nextProgress, scenesRef.current)) {
        generationStartedRef.current = false
        reportError(
          new Error('Scene planning finished without creating any scenes. Try again.'),
          'Failed to start scene generation'
        )
        return false
      }

      handOffToCoordinator(nextProgress)

      if (
        !isSceneGenerationTerminal(nextProgress?.status) &&
        isSceneGenerationInProgress(nextProgress?.status)
      ) {
        await coordinator.refreshProgress()
      }

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const alreadyRunning = message.toLowerCase().includes('already running')

      if (alreadyRunning) {
        await coordinator.refreshProgress()
        return true
      }

      generationStartedRef.current = false
      reportError(err, 'Failed to start scene generation')
      return false
    } finally {
      startingRef.current = false
      if (mountedRef.current) {
        setStarting(false)
      }
    }
  }, [coordinator, handOffToCoordinator, projectId, reportError])

  const startGenerationRef = useRef(startGeneration)
  startGenerationRef.current = startGeneration

  useEffect(() => {
    if (!enabled || !projectId || !coordinator) return undefined

    const hasScreenplay = Boolean(screenplay?.trim())
    const sceneList = scenesRef.current
    const status = initialStatus

    if (sceneList.length > 0) {
      const scenesKey = `${projectId}:has-scenes`
      if (initializedForRef.current === scenesKey) return undefined

      initializedForRef.current = scenesKey
      generationStartedRef.current = true

      if (isSceneGenerationInProgress(status)) {
        coordinator.refreshProgress()
      }
      return undefined
    }

    if (!hasScreenplay) return undefined

    const autoStartKey = `${projectId}:auto-start`
    if (initializedForRef.current === autoStartKey || generationStartedRef.current) {
      return undefined
    }

    let cancelled = false

    const initialize = async () => {
      if (cancelled) return

      if (isSceneGenerationInProgress(status)) {
        initializedForRef.current = autoStartKey
        generationStartedRef.current = true
        await coordinator.refreshProgress()
        return
      }

      if (isSceneGenerationTerminal(status)) {
        initializedForRef.current = autoStartKey
        return
      }

      // Re-check server state before starting — local list may still be hydrating.
      try {
        const latest = await getSceneGenerationProgress(projectId)
        if (!cancelled && latest) {
          handOffToCoordinator(latest)
        }
        const latestScenes = latest?.scenes ?? scenesRef.current
        const latestStatus = latest?.status ?? status
        if (
          (latestScenes?.length ?? 0) > 0 ||
          isSceneGenerationTerminal(latestStatus) ||
          isSceneGenerationInProgress(latestStatus) ||
          !shouldAutoStartSceneGeneration(latestStatus, { scenes: latestScenes ?? [] })
        ) {
          initializedForRef.current = autoStartKey
          generationStartedRef.current = (latestScenes?.length ?? 0) > 0
          return
        }
      } catch {
        // Fall through to shouldAutoStart with local data.
      }

      if (!shouldAutoStartSceneGeneration(status, { scenes: sceneList })) {
        initializedForRef.current = autoStartKey
        return
      }

      const started = await startGenerationRef.current?.()
      if (!cancelled && started) {
        initializedForRef.current = autoStartKey
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [coordinator, enabled, initialStatus, projectId, screenplay])

  const progress = coordinator?.progress ?? null
  const monitoring = Boolean(coordinator?.monitoring)

  const hasLiveSceneWork =
    isSceneGenerationInProgress(progress?.status) ||
    (progress?.remaining ?? 0) > 0 ||
    (progress?.queued ?? 0) > 0 ||
    (progress?.running ?? 0) > 0 ||
    scenes.some((scene) => scene?.status === 'queued' || scene?.status === 'generating')

  const sceneGenerationActive =
    !areSceneboardScenesGenerationSettled(scenes) &&
    (starting || isSceneGenerationInProgress(initialStatus) || hasLiveSceneWork)

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
    isStuck: Boolean(coordinator?.isStuck),
    resuming: Boolean(coordinator?.resuming),
    cancelling: Boolean(coordinator?.cancelling),
    handleResumeGeneration: () => coordinator?.handleResumeGeneration(false),
    handleCancelGeneration: () => coordinator?.handleCancelGeneration(),
    canCancel: Boolean(coordinator?.canCancel),
    canResume: Boolean(coordinator?.canResume),
  }
}
