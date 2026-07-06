import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from '../../creation/components/CharacterModal.module.css'

export default function RegenerateSceneOneModal({
  open,
  onClose,
  onConfirm,
  confirming = false,
  error = null,
}) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !confirming) {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, confirming])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={confirming ? undefined : onClose}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="regenerate-scene-one-title"
        aria-describedby="regenerate-scene-one-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="regenerate-scene-one-title" className={styles.title}>
            Regenerate Scene 1?
          </h2>
        </header>

        <div className={styles.body}>
          <p id="regenerate-scene-one-message" className={styles.hint}>
            Scene 1 already has generated images. Regenerate using updated assets?
          </p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={confirming}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={onConfirm} disabled={confirming}>
            {confirming ? 'Regenerating…' : 'Regenerate Scene 1'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
