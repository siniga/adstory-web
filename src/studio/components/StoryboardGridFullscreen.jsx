import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getActiveProjectName, getActiveScenes } from '../activeProject'
import { getTotalShotCount } from '../data'
import StoryboardGrid from '../../storyboard/StoryboardGrid'
import { IconClose } from '../icons'
import styles from './StoryboardGridFullscreen.module.css'

export default function StoryboardGridFullscreen({ open, onClose }) {
  const containerRef = useRef(null)
  const wasFullscreenRef = useRef(false)

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      wasFullscreenRef.current = false
      return undefined
    }

    const el = containerRef.current
    const enterFullscreen = async () => {
      if (!el?.requestFullscreen) return

      try {
        await el.requestFullscreen()
        wasFullscreenRef.current = true
      } catch {
        // Overlay still works when browser fullscreen is blocked.
      }
    }

    enterFullscreen()

    const handleFullscreenChange = () => {
      if (wasFullscreenRef.current && !document.fullscreenElement) {
        onClose()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [open, onClose])

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    onClose()
  }

  if (!open) return null

  const scenes = getActiveScenes()
  const projectName = getActiveProjectName()
  const shotCount = getTotalShotCount(scenes)

  return createPortal(
    <div
      ref={containerRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Storyboard grid"
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>{projectName}</h1>
          <p className={styles.subtitle}>
            Storyboard · {scenes.length} scene{scenes.length === 1 ? '' : 's'} · {shotCount} shot
            {shotCount === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close storyboard"
        >
          <IconClose />
        </button>
      </header>

      <StoryboardGrid scenes={scenes} />
    </div>,
    document.body
  )
}
