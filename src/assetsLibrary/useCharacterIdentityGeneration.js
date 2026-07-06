import { useCallback, useEffect, useRef, useState } from 'react'
import * as screenlyApi from '../services/screenlyApi'
import {
  allIdentitiesCompleted,
  buildLiveCharactersFromStatus,
  isGenerationActive,
  isGenerationFinished,
  needsIdentityGeneration,
} from './characterIdentityGeneration'

const POLL_INTERVAL_MS = 2500
const QUEUE_STALL_MS = 15000

export function useCharacterIdentityGeneration({
  projectId,
  characters = [],
  activeTab,
  loadingAssets = false,
  onReplaceCharacters,
}) {
  const [generationStatus, setGenerationStatus] = useState(null)
  const [liveCharacters, setLiveCharacters] = useState(characters)
  const [isStartingGeneration, setIsStartingGeneration] = useState(false)
  const [isPollingGeneration, setIsPollingGeneration] = useState(false)
  const [isInitializingGeneration, setIsInitializingGeneration] = useState(false)
  const [statusError, setStatusError] = useState(null)
  const [queueStallNotice, setQueueStallNotice] = useState(null)

  const pollIntervalRef = useRef(null)
  const hasInitializedRef = useRef(false)
  const hasStartedGenerationRef = useRef(false)
  const postWatchdogRef = useRef(null)
  const isMountedRef = useRef(true)
  const charactersRef = useRef(characters)
  const lastProgressSignatureRef = useRef('')
  const lastProgressChangeAtRef = useRef(Date.now())

  useEffect(() => {
    charactersRef.current = characters
    if (!generationStatus?.characters?.length) {
      setLiveCharacters(characters)
    }
  }, [characters, generationStatus?.characters?.length])

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current != null) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    setIsPollingGeneration(false)
  }, [])

  const syncFromStatus = useCallback(
    (statusData) => {
      if (!statusData) return

      const signature = JSON.stringify({
        total: statusData.total,
        completed: statusData.completed,
        failed: statusData.failed,
        queued: statusData.queued,
        generating: statusData.generating,
        progress_percent: statusData.progress_percent,
        current: statusData.current_character?.id ?? null,
        characters: (statusData.characters ?? []).map((character) => ({
          id: character.id,
          status:
            character.identity_generation_status ??
            character.identityGenerationStatus ??
            character.status,
          hero: character.hero_image_url ?? character.heroImageUrl ?? null,
        })),
      })

      if (signature !== lastProgressSignatureRef.current) {
        lastProgressSignatureRef.current = signature
        lastProgressChangeAtRef.current = Date.now()
        setQueueStallNotice(null)
      }

      setGenerationStatus(statusData)

      const nextLive = buildLiveCharactersFromStatus(charactersRef.current, statusData)
      charactersRef.current = nextLive
      setLiveCharacters(nextLive)
      onReplaceCharacters?.(nextLive)
    },
    [onReplaceCharacters]
  )

  const fetchGenerationStatus = useCallback(async () => {
    if (!projectId) return null

    const statusData = await screenlyApi.getCharacterGenerationStatus(projectId)
    if (!isMountedRef.current) return null

    console.log('Generation status', statusData)
    syncFromStatus(statusData)
    return statusData
  }, [projectId, syncFromStatus])

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current != null) return

    console.log('Starting identity generation polling')
    setIsPollingGeneration(true)
    lastProgressChangeAtRef.current = Date.now()

    const poll = async () => {
      try {
        const statusData = await fetchGenerationStatus()
        if (!statusData || !isMountedRef.current) return

        const finished = isGenerationFinished(statusData, charactersRef.current.length)
        if (finished) {
          console.log('Identity generation finished')
          stopPolling()
          return
        }

        const stalledFor = Date.now() - lastProgressChangeAtRef.current
        if (
          stalledFor >= QUEUE_STALL_MS &&
          !isGenerationActive(statusData) &&
          Number(statusData.completed ?? 0) === 0
        ) {
          setQueueStallNotice('Generation is taking longer than expected. Please wait...')
        }
      } catch (err) {
        if (!isMountedRef.current) return
        const message = err instanceof Error ? err.message : 'Failed to check generation status'
        console.error('Generation status poll failed', err)
        setStatusError(message)
        stopPolling()
      }
    }

    poll()
    pollIntervalRef.current = setInterval(poll, POLL_INTERVAL_MS)
  }, [fetchGenerationStatus, stopPolling])

  const startIdentityGeneration = useCallback(
    async ({ force = false, allowRepeat = false } = {}) => {
      if (!projectId || isStartingGeneration) return

      if (hasStartedGenerationRef.current && !allowRepeat) {
        console.warn('Identity generation POST skipped — already started')
        return
      }

      console.log('Starting identity generation...')
      setIsStartingGeneration(true)
      setStatusError(null)
      setQueueStallNotice(null)

      try {
        const startResponse = await screenlyApi.generateCharacterIdentities(projectId, { force })
        if (!isMountedRef.current) return

        hasStartedGenerationRef.current = true
        if (postWatchdogRef.current != null) {
          clearTimeout(postWatchdogRef.current)
          postWatchdogRef.current = null
        }
        console.log('Generation started successfully', startResponse)

        if (startResponse?.characters?.length || startResponse?.total != null) {
          syncFromStatus(startResponse)
        }

        const statusData = await fetchGenerationStatus()
        if (!statusData || !isMountedRef.current) return

        if (!isGenerationFinished(statusData, charactersRef.current.length)) {
          startPolling()
        }
      } catch (err) {
        if (!isMountedRef.current) return
        const message =
          err instanceof Error ? err.message : 'Failed to start character identity generation'
        console.error('Identity generation POST failed', err)
        setStatusError(message)
      } finally {
        if (isMountedRef.current) {
          setIsStartingGeneration(false)
        }
      }
    },
    [fetchGenerationStatus, isStartingGeneration, projectId, startPolling, syncFromStatus]
  )

  const handleRetryFailed = useCallback(() => {
    hasStartedGenerationRef.current = false
    startIdentityGeneration({ force: false, allowRepeat: true })
  }, [startIdentityGeneration])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      stopPolling()
    }
  }, [stopPolling])

  useEffect(() => {
    hasInitializedRef.current = false
    hasStartedGenerationRef.current = false
    lastProgressSignatureRef.current = ''
    lastProgressChangeAtRef.current = Date.now()
    if (postWatchdogRef.current != null) {
      clearTimeout(postWatchdogRef.current)
      postWatchdogRef.current = null
    }
    setGenerationStatus(null)
    setLiveCharacters(characters)
    setStatusError(null)
    setQueueStallNotice(null)
    stopPolling()
  }, [projectId, stopPolling])

  useEffect(() => {
    if (activeTab !== 'characters') {
      hasInitializedRef.current = false
      hasStartedGenerationRef.current = false
      stopPolling()
    }
  }, [activeTab, stopPolling])

  useEffect(() => {
    if (activeTab !== 'characters' || !projectId) return
    if (characters.length === 0 && loadingAssets) return
    if (characters.length === 0) return
    if (hasInitializedRef.current) return

    hasInitializedRef.current = true
    console.log('Assets page mounted')
    console.log('Assets page mounted — initializing character identity generation')

    let cancelled = false

    if (postWatchdogRef.current != null) {
      clearTimeout(postWatchdogRef.current)
    }
    postWatchdogRef.current = setTimeout(() => {
      if (!hasStartedGenerationRef.current && !cancelled && isMountedRef.current) {
        console.warn(
          'Identity generation POST never fired — check initialization guards and project characters'
        )
      }
    }, 10000)

    const initialize = async () => {
      setIsInitializingGeneration(true)
      try {
        const statusData = await screenlyApi.getCharacterGenerationStatus(projectId)
        if (cancelled || !isMountedRef.current) return

        console.log('Generation status (initial)', statusData)
        syncFromStatus(statusData)

        const characterCount = charactersRef.current.length
        const finished = isGenerationFinished(statusData, characterCount)
        const active = isGenerationActive(statusData)
        const needsStart = needsIdentityGeneration(
          buildLiveCharactersFromStatus(charactersRef.current, statusData)
        )

        if (finished && allIdentitiesCompleted(charactersRef.current)) {
          console.log('All character identities already completed')
          return
        }

        if (active) {
          console.log('Generation already active — polling')
          startPolling()
          return
        }

        if (finished && needsStart) {
          console.warn('Generation status finished but characters still need identities — restarting')
        }

        if (needsStart) {
          await startIdentityGeneration({ force: false })
          return
        }

        if (!finished) {
          startPolling()
        }
      } catch (err) {
        if (cancelled || !isMountedRef.current) return

        const message = err instanceof Error ? err.message : 'Failed to load generation status'
        console.error('Initial generation status failed', err)
        setStatusError(message)

        if (needsIdentityGeneration(charactersRef.current)) {
          await startIdentityGeneration({ force: false })
        }
      } finally {
        if (!cancelled && isMountedRef.current) {
          setIsInitializingGeneration(false)
        }
      }
    }

    initialize()

    return () => {
      cancelled = true
      hasInitializedRef.current = false
      if (postWatchdogRef.current != null) {
        clearTimeout(postWatchdogRef.current)
        postWatchdogRef.current = null
      }
    }
  }, [
    activeTab,
    characters.length,
    loadingAssets,
    projectId,
    startIdentityGeneration,
    startPolling,
    syncFromStatus,
  ])

  const total = Number(
    generationStatus?.total ?? liveCharacters.length ?? characters.length ?? 0
  )
  const completed = Number(generationStatus?.completed ?? 0)
  const failed = Number(generationStatus?.failed ?? 0)
  const progressPercent = Number(
    generationStatus?.progress_percent ??
      (total > 0 ? Math.round((completed / total) * 100) : 0)
  )

  const isGenerationRunning =
    isInitializingGeneration ||
    isStartingGeneration ||
    isPollingGeneration ||
    isGenerationActive(generationStatus ?? {})

  const isAllCompleted =
    total > 0
      ? completed + failed >= total && failed === 0 && completed === total
      : allIdentitiesCompleted(liveCharacters)

  const hasFailures = failed > 0

  return {
    generationStatus,
    liveCharacters,
    isStartingGeneration,
    isPollingGeneration,
    isInitializingGeneration,
    statusError,
    queueStallNotice,
    isGenerationRunning,
    isAllCompleted,
    hasFailures,
    total,
    completed,
    failed,
    progressPercent,
    currentCharacter: generationStatus?.current_character ?? null,
    startIdentityGeneration,
    handleRetryFailed,
    fetchGenerationStatus,
  }
}
