import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getShotDisplayImageUrl } from '../../utils/resolveMediaUrl'
import { IconClose } from '../../studio/icons'
import { shotDisplayTitle } from '../shotLightbox'
import styles from './ShotRegenerateModal.module.css'

export default function ShotRegenerateModal({
  open,
  shot,
  sceneLabel,
  submitting = false,
  error = null,
  onClose,
  onSubmit,
}) {
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (!open) return
    setPrompt('')
  }, [open, shot?.apiId, shot?.id])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !submitting) onClose?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, submitting, onClose])

  if (!open || !shot) return null

  const title = shotDisplayTitle(shot)
  const imageUrl = getShotDisplayImageUrl(shot)

  const handleSubmit = (event) => {
    event.preventDefault()
    const value = prompt.trim()
    if (!value || submitting) return
    onSubmit?.(value)
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={submitting ? undefined : onClose}>
      <form
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shot-regenerate-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className={styles.header}>
          <div>
            <h2 id="shot-regenerate-title" className={styles.title}>
              Regenerate shot
            </h2>
            <p className={styles.subtitle}>
              {sceneLabel ? `${sceneLabel} · ${title}` : title}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          <div className={styles.preview}>
            {imageUrl ? (
              <img src={imageUrl} alt={title} className={styles.image} />
            ) : (
              <div className={styles.placeholder}>No image yet</div>
            )}
          </div>

          <label className={styles.field}>
            <span className={styles.label}>Adjustment prompt</span>
            <textarea
              className={styles.textarea}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Describe how to change this shot — lighting, weather, camera, mood…"
              required
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className={styles.submitBtn} disabled={submitting || !prompt.trim()}>
            {submitting ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
      </form>
    </div>,
    document.body
  )
}
