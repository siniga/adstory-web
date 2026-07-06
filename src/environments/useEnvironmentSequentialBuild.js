import { useCallback, useEffect, useRef, useState } from 'react'
import { mapApiEnvironment, mapApiEnvironments } from '../services/api/mapApiProject'
import * as screenlyApi from '../services/screenlyApi'

const BUILD_DELAY_MS = 300

export function useEnvironmentSequentialBuild({
  projectId,
  onReplaceEnvironments,
  autoStart = true,
  initialEnvironments = [],
}) {
  const [environments, setEnvironments] = useState(initialEnvironments)
  const [isBuilding, setIsBuilding] = useState(false)
  const [isBuildingNext, setIsBuildingNext] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [activeEnvironmentId, setActiveEnvironmentId] = useState(null)

  const hasStartedRef = useRef(false)
  const isBuildingNextRef = useRef(false)
  const mountedRef = useRef(true)
  const delayTimeoutRef = useRef(null)
  const environmentsRef = useRef(environments)

  useEffect(() => {
    environmentsRef.current = environments
  }, [environments])

  const replaceEnvironments = useCallback(
    (nextEnvironments) => {
      environmentsRef.current = nextEnvironments
      setEnvironments(nextEnvironments)
      onReplaceEnvironments?.(nextEnvironments)
    },
    [onReplaceEnvironments]
  )

  const buildNextEnvironment = useCallback(async () => {
    if (!projectId || !mountedRef.current) return
    if (isBuildingNextRef.current) return

    isBuildingNextRef.current = true
    setIsBuildingNext(true)
    setError(null)
    setActiveEnvironmentId(null)

    try {
      const { done: isDone, data } = await screenlyApi.buildNextEnvironment(projectId)
      if (!mountedRef.current) return

      if (isDone) {
        if (data?.completed != null) setCompleted(Number(data.completed))
        if (data?.total != null) setTotal(Number(data.total))
        setDone(true)
        setIsBuilding(false)
        setIsBuildingNext(false)
        isBuildingNextRef.current = false
        return
      }

      if (data?.environment) {
        const mapped = mapApiEnvironment(data.environment)
        setActiveEnvironmentId(mapped.id)
        const previous = environmentsRef.current
        const exists = previous.some((item) => String(item.id) === String(mapped.id))
        const next = exists
          ? previous.map((item) => (String(item.id) === String(mapped.id) ? mapped : item))
          : [...previous, mapped]

        replaceEnvironments(next)
        setActiveEnvironmentId(null)
      }

      if (data?.completed != null) setCompleted(Number(data.completed))
      if (data?.total != null) setTotal(Number(data.total))

      isBuildingNextRef.current = false
      setIsBuildingNext(false)

      delayTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          buildNextEnvironment()
        }
      }, BUILD_DELAY_MS)
    } catch (err) {
      if (!mountedRef.current) return

      isBuildingNextRef.current = false
      setIsBuildingNext(false)
      setIsBuilding(false)
      setHasSession(true)

      const message =
        err instanceof Error ? err.message : 'Failed to build the next environment'
      setError(message)
    }
  }, [projectId, replaceEnvironments])

  const startEnvironmentBuild = useCallback(
    async ({ force = false } = {}) => {
      if (!projectId) return
      if (hasStartedRef.current && !force) return

      hasStartedRef.current = true
      setIsBuilding(true)
      setError(null)
      setDone(false)

      try {
        const { data } = await screenlyApi.startEnvironmentBuild(projectId)
        if (!mountedRef.current) return

        setHasSession(true)

        if (data?.total != null) setTotal(Number(data.total))
        if (data?.completed != null) setCompleted(Number(data.completed))

        await buildNextEnvironment()
      } catch (err) {
        if (!mountedRef.current) return

        hasStartedRef.current = false
        setIsBuilding(false)

        const message =
          err instanceof Error ? err.message : 'Failed to start environment build'
        setError(message)
      }
    },
    [buildNextEnvironment, projectId]
  )

  const retry = useCallback(async () => {
    if (!projectId) return

    setError(null)
    setIsBuilding(true)
    setDone(false)

    if (hasSession) {
      await buildNextEnvironment()
      return
    }

    hasStartedRef.current = false
    await startEnvironmentBuild()
  }, [buildNextEnvironment, hasSession, projectId, startEnvironmentBuild])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      if (delayTimeoutRef.current != null) {
        clearTimeout(delayTimeoutRef.current)
        delayTimeoutRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    hasStartedRef.current = false
    isBuildingNextRef.current = false
    setEnvironments(initialEnvironments)
    environmentsRef.current = initialEnvironments
    setIsBuilding(false)
    setIsBuildingNext(false)
    setCompleted(0)
    setTotal(0)
    setError(null)
    setDone(false)
    setHasSession(false)
    setActiveEnvironmentId(null)

    if (delayTimeoutRef.current != null) {
      clearTimeout(delayTimeoutRef.current)
      delayTimeoutRef.current = null
    }
  }, [initialEnvironments, projectId])

  useEffect(() => {
    if (!projectId || !autoStart) return
    startEnvironmentBuild()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, projectId])

  const setEnvironmentList = useCallback(
    (nextEnvironments) => {
      replaceEnvironments(nextEnvironments)
    },
    [replaceEnvironments]
  )

  const runNextBuildOnce = useCallback(async () => {
    if (!projectId || !mountedRef.current) return null
    if (isBuildingNextRef.current) return null

    isBuildingNextRef.current = true
    setIsBuildingNext(true)
    setError(null)

    try {
      const { done: isDone, data } = await screenlyApi.buildNextEnvironment(projectId)
      if (!mountedRef.current) return null

      if (isDone) {
        if (data?.completed != null) setCompleted(Number(data.completed))
        if (data?.total != null) setTotal(Number(data.total))
        setDone(true)
        setIsBuilding(false)
        return data
      }

      if (data?.environment) {
        const mapped = mapApiEnvironment(data.environment)
        const previous = environmentsRef.current
        const exists = previous.some((item) => String(item.id) === String(mapped.id))
        const next = exists
          ? previous.map((item) => (String(item.id) === String(mapped.id) ? mapped : item))
          : [...previous, mapped]

        replaceEnvironments(next)
      }

      if (data?.completed != null) setCompleted(Number(data.completed))
      if (data?.total != null) setTotal(Number(data.total))

      return data
    } catch (err) {
      if (!mountedRef.current) return null

      setIsBuilding(false)
      setHasSession(true)

      const message =
        err instanceof Error ? err.message : 'Failed to build the next environment'
      setError(message)
      throw err
    } finally {
      isBuildingNextRef.current = false
      setIsBuildingNext(false)
    }
  }, [projectId, replaceEnvironments])

  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    environments,
    isBuilding,
    isBuildingNext,
    activeEnvironmentId,
    completed,
    total,
    progressPercent,
    error,
    done,
    hasSession,
    retry,
    startBuild: startEnvironmentBuild,
    runNextBuildOnce,
    setEnvironmentList,
  }
}
