import { useCallback, useEffect, useState } from 'react'

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const tag = target.tagName
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    target.isContentEditable
  )
}

export function useStudioFocusMode({ enabled = true, onFocusModeChange } = {}) {
  const [isFocusMode, setIsFocusMode] = useState(false)
  const [showLeftPanel, setShowLeftPanel] = useState(true)
  const [showRightPanel, setShowRightPanel] = useState(true)

  const requestBrowserFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Internal focus mode still applies when browser fullscreen is blocked.
    }
  }, [])

  const exitBrowserFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
    } catch {
      // Ignore exit errors.
    }
  }, [])

  const enterFocusMode = useCallback(async () => {
    setIsFocusMode(true)
    setShowLeftPanel(false)
    setShowRightPanel(false)
    await requestBrowserFullscreen()
  }, [requestBrowserFullscreen])

  const exitFocusMode = useCallback(async () => {
    setIsFocusMode(false)
    setShowLeftPanel(true)
    setShowRightPanel(true)
    await exitBrowserFullscreen()
  }, [exitBrowserFullscreen])

  const toggleFocusMode = useCallback(async () => {
    if (isFocusMode) {
      await exitFocusMode()
    } else {
      await enterFocusMode()
    }
  }, [enterFocusMode, exitFocusMode, isFocusMode])

  useEffect(() => {
    onFocusModeChange?.(isFocusMode)
  }, [isFocusMode, onFocusModeChange])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFocusMode) {
        setIsFocusMode(false)
        setShowLeftPanel(true)
        setShowRightPanel(true)
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isFocusMode])

  useEffect(() => {
    if (!enabled) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isFocusMode) {
        if (!isEditableTarget(event.target)) {
          event.preventDefault()
          exitFocusMode()
        }
        return
      }

      if (event.key !== 'f' && event.key !== 'F') {
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      if (isEditableTarget(event.target)) {
        return
      }

      event.preventDefault()
      toggleFocusMode()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, exitFocusMode, isFocusMode, toggleFocusMode])

  useEffect(() => {
    return () => {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {})
      }
    }
  }, [])

  return {
    isFocusMode,
    showLeftPanel,
    showRightPanel,
    setShowLeftPanel,
    setShowRightPanel,
    enterFocusMode,
    exitFocusMode,
    toggleFocusMode,
  }
}
