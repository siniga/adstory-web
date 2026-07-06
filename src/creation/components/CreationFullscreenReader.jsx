import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../../studio/icons'
import styles from './CreationFullscreenReader.module.css'

export default function CreationFullscreenReader({
  open,
  onClose,
  eyebrow,
  title,
  subtitle,
  children,
}) {
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

  return createPortal(
    <div
      ref={containerRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} fullscreen reader`}
    >
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleClose}
          aria-label="Close fullscreen reader"
        >
          <IconClose />
        </button>
      </header>
      <div className={styles.body}>{children}</div>
    </div>,
    document.body
  )
}
