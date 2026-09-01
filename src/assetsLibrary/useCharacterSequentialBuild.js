import { useCallback, useEffect, useRef, useState } from 'react'
import { mapApiCharacter } from '../services/api/mapApiProject'
import * as projectApi from '../services/projectApi'

const BUILD_DELAY_MS = 300

export function useCharacterSequentialBuild({
  projectId,
  onReplaceCharacters,
  autoStart = true,
  initialCharacters = [],
}) {
  const [characters, setCharacters] = useState(initialCharacters)
  const [isBuilding, setIsBuilding] = useState(false)
  const [isBuildingNext, setIsBuildingNext] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const [activeCharacterId, setActiveCharacterId] = useState(null)

  const hasStartedRef = useRef(false)
  const isBuildingNextRef = useRef(false)
  const mountedRef = useRef(true)
  const delayTimeoutRef = useRef(null)
  const charactersRef = useRef(characters)

  useEffect(() => {
    charactersRef.current = characters
  }, [characters])

  const replaceCharacters = useCallback(
    (nextCharacters) => {
      charactersRef.current = nextCharacters
      setCharacters(nextCharacters)
      onReplaceCharacters?.(nextCharacters)
    },
    [onReplaceCharacters]
  )

  const buildNextCharacter = useCallback(async () => {
    if (!projectId || !mountedRef.current) return
    if (isBuildingNextRef.current) return

    isBuildingNextRef.current = true
    setIsBuildingNext(true)
    setError(null)
    setActiveCharacterId(null)

    try {
      const { done: isDone, data } = await projectApi.buildNextCharacter(projectId)
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

      if (data?.character) {
        const mapped = mapApiCharacter(data.character)
        setActiveCharacterId(mapped.id)
        const previous = charactersRef.current
        const exists = previous.some((item) => String(item.id) === String(mapped.id))
        const next = exists
          ? previous.map((item) => (String(item.id) === String(mapped.id) ? mapped : item))
          : [...previous, mapped]

        replaceCharacters(next)
        setActiveCharacterId(null)
      }

      if (data?.completed != null) setCompleted(Number(data.completed))
      if (data?.total != null) setTotal(Number(data.total))

      isBuildingNextRef.current = false
      setIsBuildingNext(false)

      delayTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          buildNextCharacter()
        }
      }, BUILD_DELAY_MS)
    } catch (err) {
      if (!mountedRef.current) return

      isBuildingNextRef.current = false
      setIsBuildingNext(false)
      setIsBuilding(false)
      setHasSession(true)

      const message =
        err instanceof Error ? err.message : 'Failed to build the next character'
      setError(message)
    }
  }, [projectId, replaceCharacters])

  const startCharacterBuild = useCallback(async ({ force = false } = {}) => {
    if (!projectId) return
    if (hasStartedRef.current && !force) return

    hasStartedRef.current = true
    setIsBuilding(true)
    setError(null)
    setDone(false)

    try {
      const { data } = await projectApi.startCharacterBuild(projectId)
      if (!mountedRef.current) return

      setHasSession(true)

      if (data?.total != null) setTotal(Number(data.total))
      if (data?.completed != null) setCompleted(Number(data.completed))

      await buildNextCharacter()
    } catch (err) {
      if (!mountedRef.current) return

      hasStartedRef.current = false
      setIsBuilding(false)

      const message =
        err instanceof Error ? err.message : 'Failed to start character build'
      setError(message)
    }
  }, [buildNextCharacter, projectId])

  const retry = useCallback(async () => {
    if (!projectId) return

    setError(null)
    setIsBuilding(true)
    setDone(false)

    if (hasSession) {
      await buildNextCharacter()
      return
    }

    hasStartedRef.current = false
    await startCharacterBuild()
  }, [buildNextCharacter, hasSession, projectId, startCharacterBuild])

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
    setCharacters(initialCharacters)
    charactersRef.current = initialCharacters
    setIsBuilding(false)
    setIsBuildingNext(false)
    setCompleted(0)
    setTotal(0)
    setError(null)
    setDone(false)
    setHasSession(false)
    setActiveCharacterId(null)

    if (delayTimeoutRef.current != null) {
      clearTimeout(delayTimeoutRef.current)
      delayTimeoutRef.current = null
    }
  }, [initialCharacters, projectId])

  useEffect(() => {
    if (!projectId || !autoStart) return
    startCharacterBuild()
    // Only restart the sequential build when the project changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, projectId])

  const setCharacterList = useCallback(
    (nextCharacters) => {
      replaceCharacters(nextCharacters)
    },
    [replaceCharacters]
  )

  const runNextBuildOnce = useCallback(async () => {
    if (!projectId || !mountedRef.current) return null
    if (isBuildingNextRef.current) return null

    isBuildingNextRef.current = true
    setIsBuildingNext(true)
    setError(null)

    try {
      const { done: isDone, data } = await projectApi.buildNextCharacter(projectId)
      if (!mountedRef.current) return null

      if (isDone) {
        if (data?.completed != null) setCompleted(Number(data.completed))
        if (data?.total != null) setTotal(Number(data.total))
        setDone(true)
        setIsBuilding(false)
        return data
      }

      if (data?.character) {
        const mapped = mapApiCharacter(data.character)
        const previous = charactersRef.current
        const exists = previous.some((item) => String(item.id) === String(mapped.id))
        const next = exists
          ? previous.map((item) => (String(item.id) === String(mapped.id) ? mapped : item))
          : [...previous, mapped]

        replaceCharacters(next)
      }

      if (data?.completed != null) setCompleted(Number(data.completed))
      if (data?.total != null) setTotal(Number(data.total))

      return data
    } catch (err) {
      if (!mountedRef.current) return null

      setIsBuilding(false)
      setHasSession(true)

      const message =
        err instanceof Error ? err.message : 'Failed to build the next character'
      setError(message)
      throw err
    } finally {
      isBuildingNextRef.current = false
      setIsBuildingNext(false)
    }
  }, [projectId, replaceCharacters])

  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0

  return {
    characters,
    isBuilding,
    isBuildingNext,
    activeCharacterId,
    completed,
    total,
    progressPercent,
    error,
    done,
    hasSession,
    retry,
    startBuild: startCharacterBuild,
    runNextBuildOnce,
    setCharacterList,
  }
}
