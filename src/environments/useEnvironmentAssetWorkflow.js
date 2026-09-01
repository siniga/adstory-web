import { useCallback, useEffect, useRef, useState } from 'react'
import { mapApiEnvironment, mapApiEnvironments } from '../services/api/mapApiProject'
import * as projectApi from '../services/projectApi'
import {
  ASSET_POLL_INTERVAL_MS,
  replaceItemInList,
  shouldStopEnvironmentPolling,
  sleep,
} from '../assetsLibrary/workflow/assetWorkflowPolling'

export function useEnvironmentAssetWorkflow({
  projectId,
  initialEnvironments = [],
  onReplaceEnvironments,
}) {
  const [environments, setEnvironments] = useState(initialEnvironments)
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)
  const [generatingIds, setGeneratingIds] = useState(() => new Set())
  const [isBuildingAll, setIsBuildingAll] = useState(false)
  const [buildError, setBuildError] = useState(null)

  const mountedRef = useRef(true)
  const environmentsRef = useRef(initialEnvironments)
  const pollTokenRef = useRef(0)

  useEffect(() => {
    environmentsRef.current = environments
  }, [environments])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      pollTokenRef.current += 1
    }
  }, [])

  const replaceEnvironments = useCallback(
    (nextEnvironments) => {
      environmentsRef.current = nextEnvironments
      setEnvironments(nextEnvironments)
      onReplaceEnvironments?.(nextEnvironments)
    },
    [onReplaceEnvironments]
  )

  const refreshEnvironmentList = useCallback(async () => {
    if (!projectId) return []

    const response = await projectApi.getProjectEnvironments(projectId)
    const mapped = mapApiEnvironments(response.environments ?? [])

    if (mountedRef.current) {
      replaceEnvironments(mapped.length ? mapped : environmentsRef.current)
    }

    return mapped
  }, [projectId, replaceEnvironments])

  useEffect(() => {
    let cancelled = false

    async function loadEnvironments() {
      if (!projectId) return

      setLoadingList(true)
      setListError(null)

      try {
        const mapped = await refreshEnvironmentList()
        if (cancelled) return

        if (!mapped.length && initialEnvironments.length) {
          replaceEnvironments(initialEnvironments)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load environments from screenplay'
          setListError(message)

          if (initialEnvironments.length) {
            replaceEnvironments(initialEnvironments)
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false)
        }
      }
    }

    loadEnvironments()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const pollEnvironmentList = useCallback(async () => {
    const pollToken = pollTokenRef.current + 1
    pollTokenRef.current = pollToken

    while (mountedRef.current && pollTokenRef.current === pollToken) {
      try {
        const mapped = await refreshEnvironmentList()

        if (!mountedRef.current || pollTokenRef.current !== pollToken) return

        if (shouldStopEnvironmentPolling(mapped)) {
          setIsBuildingAll(false)
          return
        }
      } catch (err) {
        if (!mountedRef.current || pollTokenRef.current !== pollToken) return

        const message =
          err instanceof Error ? err.message : 'Failed to refresh environment generation status'
        setBuildError(message)
        setIsBuildingAll(false)
        return
      }

      await sleep(ASSET_POLL_INTERVAL_MS)
    }
  }, [refreshEnvironmentList])

  const updateSingleEnvironment = useCallback(
    (mapped) => {
      const next = replaceItemInList(environmentsRef.current, mapped)
      replaceEnvironments(next)
    },
    [replaceEnvironments]
  )

  const addGeneratingId = useCallback((itemId) => {
    setGeneratingIds((current) => {
      const next = new Set(current)
      next.add(String(itemId))
      return next
    })
  }, [])

  const removeGeneratingId = useCallback((itemId) => {
    setGeneratingIds((current) => {
      const next = new Set(current)
      next.delete(String(itemId))
      return next
    })
  }, [])

  const generateOne = useCallback(
    async (environmentId) => {
      const normalizedId = String(environmentId)
      if (!environmentId || isBuildingAll || generatingIds.has(normalizedId)) {
        return
      }

      addGeneratingId(normalizedId)
      setBuildError(null)

      try {
        const result = await projectApi.generateEnvironment(environmentId)

        if (result?.environment) {
          updateSingleEnvironment(mapApiEnvironment(result.environment))
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to generate environment'
        throw new Error(message)
      } finally {
        removeGeneratingId(normalizedId)
      }
    },
    [addGeneratingId, generatingIds, isBuildingAll, removeGeneratingId, updateSingleEnvironment]
  )

  const generateAll = useCallback(async () => {
    if (isBuildingAll || !projectId) return

    setBuildError(null)
    setIsBuildingAll(true)

    try {
      await projectApi.generateAllEnvironments(projectId)
      await refreshEnvironmentList()
      await pollEnvironmentList()
    } catch (err) {
      if (!mountedRef.current) return

      const message =
        err instanceof Error ? err.message : 'Failed to generate environments'
      setBuildError(message)
      setIsBuildingAll(false)
      throw new Error(message)
    }
  }, [isBuildingAll, pollEnvironmentList, projectId, refreshEnvironmentList])

  const retryBuild = useCallback(async () => {
    setBuildError(null)
    await generateAll()
  }, [generateAll])

  return {
    environments,
    loadingList,
    listError,
    generatingIds,
    isBuildingAll,
    buildError,
    generateOne,
    generateAll,
    retryBuild,
  }
}
