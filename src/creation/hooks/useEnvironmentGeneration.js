import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getEnvironmentGenerationProgress,
  retryEnvironmentGeneration,
  startEnvironmentGeneration,
} from '../../services/adstoryApi'
import { formatUserFriendlyError } from '../../utils/userFriendlyErrors'
import {
  isGenerationInProgress,
  isGenerationTerminal,
} from '../aiGenerationStatus'
import {
  allEnvironmentsImageComplete,
  hasProjectEnvironments,
  shouldAutoStartEnvironmentGeneration,
} from '../environmentGenerationStatus'
import {
  GENERATION_TYPES,
  useProjectGenerationSlice,
} from '../projectGeneration/ProjectGenerationProvider'

const environmentStartInflight = new Map()

/**
 * Environment generation: start/retry + display only.
 * ProjectGenerationProvider owns all polling / list merge.
 */
export default function useEnvironmentGeneration({
  enabled = false,
  projectId,
  initialStatus = null,
  visualStyle = '',
  environments = [],
  onError,
}) {
  const coordinator = useProjectGenerationSlice(GENERATION_TYPES.ENVIRONMENTS, {
    visualStyle,
  })

  const [starting, setStarting] = useState(false)
  const generationStartedRef = useRef(false)
  const initializedForRef = useRef(null)
  const mountedRef = useRef(true)
  const projectIdRef = useRef(projectId)
  const startingRef = useRef(false)
  const environmentsRef = useRef(environments)

  useEffect(() => {
    environmentsRef.current = environments
  }, [environments])

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

  const handOff = useCallback(
    async (nextProgress) => {
      if (!coordinator || !nextProgress) return
      coordinator.publishProgress(nextProgress)
      if (isGenerationInProgress(nextProgress?.status)) {
        await coordinator.refreshProgress()
      }
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
      let startPromise = environmentStartInflight.get(String(projectId))
      if (!startPromise) {
        startPromise = startEnvironmentGeneration(projectId, {
          style: visualStyle,
        }).finally(() => {
          environmentStartInflight.delete(String(projectId))
        })
        environmentStartInflight.set(String(projectId), startPromise)
      }

      const nextProgress = await startPromise
      if (!mountedRef.current) return true

      await handOff(nextProgress)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const alreadyRunning = message.toLowerCase().includes('already running')

      if (alreadyRunning) {
        await coordinator.refreshProgress()
        return true
      }

      generationStartedRef.current = false
      reportError(err, 'Failed to start environment generation')
      return false
    } finally {
      startingRef.current = false
      if (mountedRef.current) {
        setStarting(false)
      }
    }
  }, [coordinator, handOff, projectId, reportError, visualStyle])

  const retryEnvironment = useCallback(
    async (environmentId) => {
      if (!projectId || !coordinator || environmentId == null) return false

      try {
        const nextProgress = await retryEnvironmentGeneration(projectId, environmentId)
        await handOff(nextProgress)
        return true
      } catch (err) {
        reportError(err, 'Failed to retry environment generation')
        return false
      }
    },
    [coordinator, handOff, projectId, reportError, visualStyle]
  )

  const startGenerationRef = useRef(startGeneration)
  startGenerationRef.current = startGeneration

  useEffect(() => {
    if (!enabled || !projectId || !coordinator) return undefined

    const list = environmentsRef.current
    const status = initialStatus

    if (hasProjectEnvironments(list) || allEnvironmentsImageComplete(list)) {
      const key = `${projectId}:has-environments`
      if (initializedForRef.current === key) return undefined
      initializedForRef.current = key
      generationStartedRef.current = true

      if (isGenerationInProgress(status)) {
        coordinator.refreshProgress()
      }
      return undefined
    }

    const autoStartKey = `${projectId}:auto-start`
    if (initializedForRef.current === autoStartKey || generationStartedRef.current) {
      return undefined
    }

    let cancelled = false

    const initialize = async () => {
      if (cancelled) return

      if (isGenerationInProgress(status)) {
        initializedForRef.current = autoStartKey
        generationStartedRef.current = true
        await coordinator.refreshProgress()
        return
      }

      if (isGenerationTerminal(status)) {
        initializedForRef.current = autoStartKey
        return
      }

      try {
        const latest = await getEnvironmentGenerationProgress(projectId)
        if (!cancelled && latest) {
          await handOff(latest)
        }
        const latestEnvironments = latest?.environments ?? environmentsRef.current
        const latestStatus = latest?.status ?? status
        if (
          hasProjectEnvironments(latestEnvironments) ||
          allEnvironmentsImageComplete(latestEnvironments) ||
          isGenerationTerminal(latestStatus) ||
          isGenerationInProgress(latestStatus) ||
          !shouldAutoStartEnvironmentGeneration(latestStatus, {
            environments: latestEnvironments ?? [],
          })
        ) {
          initializedForRef.current = autoStartKey
          generationStartedRef.current = hasProjectEnvironments(latestEnvironments)
          return
        }
      } catch {
        // Fall through with local list.
      }

      if (!shouldAutoStartEnvironmentGeneration(status, { environments: list })) {
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
  }, [coordinator, enabled, initialStatus, projectId])

  return {
    progress: coordinator?.progress ?? null,
    monitoring: Boolean(coordinator?.monitoring),
    starting,
    isStuck: Boolean(coordinator?.isStuck),
    resuming: Boolean(coordinator?.resuming),
    cancelling: Boolean(coordinator?.cancelling),
    canCancel: Boolean(coordinator?.canCancel),
    canResume: Boolean(coordinator?.canResume),
    handleResumeGeneration: (retryFailed = false) =>
      coordinator?.handleResumeGeneration(retryFailed),
    handleCancelGeneration: () => coordinator?.handleCancelGeneration(),
    startGeneration,
    retryEnvironment,
  }
}
