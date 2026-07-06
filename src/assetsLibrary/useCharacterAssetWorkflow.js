import { useCallback, useEffect, useRef, useState } from 'react'
import { mapApiCharacter, mapApiCharacters } from '../services/api/mapApiProject'
import * as screenlyApi from '../services/screenlyApi'
import {
  ASSET_POLL_INTERVAL_MS,
  replaceItemInList,
  shouldStopCharacterPolling,
  sleep,
} from './workflow/assetWorkflowPolling'

export function useCharacterAssetWorkflow({
  projectId,
  initialCharacters = [],
  onReplaceCharacters,
}) {
  const [characters, setCharacters] = useState(initialCharacters)
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)
  const [generatingIds, setGeneratingIds] = useState(() => new Set())
  const [isBuildingAll, setIsBuildingAll] = useState(false)
  const [buildError, setBuildError] = useState(null)

  const mountedRef = useRef(true)
  const charactersRef = useRef(initialCharacters)
  const pollTokenRef = useRef(0)

  useEffect(() => {
    charactersRef.current = characters
  }, [characters])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      pollTokenRef.current += 1
    }
  }, [])

  const replaceCharacters = useCallback(
    (nextCharacters) => {
      charactersRef.current = nextCharacters
      setCharacters(nextCharacters)
      onReplaceCharacters?.(nextCharacters)
    },
    [onReplaceCharacters]
  )

  const refreshCharacterList = useCallback(async () => {
    if (!projectId) return []

    const response = await screenlyApi.getProjectCharacters(projectId)
    const mapped = mapApiCharacters(response.characters ?? [])

    if (mountedRef.current) {
      replaceCharacters(mapped.length ? mapped : charactersRef.current)
    }

    return mapped
  }, [projectId, replaceCharacters])

  useEffect(() => {
    let cancelled = false

    async function loadCharacters() {
      if (!projectId) return

      setLoadingList(true)
      setListError(null)

      try {
        const mapped = await refreshCharacterList()
        if (cancelled) return

        if (!mapped.length && initialCharacters.length) {
          replaceCharacters(initialCharacters)
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : 'Failed to load characters from screenplay'
          setListError(message)

          if (initialCharacters.length) {
            replaceCharacters(initialCharacters)
          }
        }
      } finally {
        if (!cancelled) {
          setLoadingList(false)
        }
      }
    }

    loadCharacters()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  const pollCharacterList = useCallback(async () => {
    const pollToken = pollTokenRef.current + 1
    pollTokenRef.current = pollToken

    while (mountedRef.current && pollTokenRef.current === pollToken) {
      try {
        const mapped = await refreshCharacterList()

        if (!mountedRef.current || pollTokenRef.current !== pollToken) return

        if (shouldStopCharacterPolling(mapped)) {
          setIsBuildingAll(false)
          return
        }
      } catch (err) {
        if (!mountedRef.current || pollTokenRef.current !== pollToken) return

        const message =
          err instanceof Error ? err.message : 'Failed to refresh character generation status'
        setBuildError(message)
        setIsBuildingAll(false)
        return
      }

      await sleep(ASSET_POLL_INTERVAL_MS)
    }
  }, [refreshCharacterList])

  const updateSingleCharacter = useCallback(
    (mapped) => {
      const next = replaceItemInList(charactersRef.current, mapped)
      replaceCharacters(next)
    },
    [replaceCharacters]
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
    async (characterId) => {
      const normalizedId = String(characterId)
      if (!characterId || isBuildingAll || generatingIds.has(normalizedId)) {
        return
      }

      addGeneratingId(normalizedId)
      setBuildError(null)

      try {
        const result = await screenlyApi.generateCharacter(characterId)

        if (result?.character) {
          updateSingleCharacter(mapApiCharacter(result.character))
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to generate character'
        throw new Error(message)
      } finally {
        removeGeneratingId(normalizedId)
      }
    },
    [addGeneratingId, generatingIds, isBuildingAll, removeGeneratingId, updateSingleCharacter]
  )

  const generateAll = useCallback(async () => {
    if (isBuildingAll || !projectId) return

    setBuildError(null)
    setIsBuildingAll(true)

    try {
      await screenlyApi.generateAllCharacters(projectId)
      await refreshCharacterList()
      await pollCharacterList()
    } catch (err) {
      if (!mountedRef.current) return

      const message =
        err instanceof Error ? err.message : 'Failed to generate characters'
      setBuildError(message)
      setIsBuildingAll(false)
      throw new Error(message)
    }
  }, [isBuildingAll, pollCharacterList, projectId, refreshCharacterList])

  const retryBuild = useCallback(async () => {
    setBuildError(null)
    await generateAll()
  }, [generateAll])

  return {
    characters,
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
