import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './CharacterModal.module.css'

export default function EnvironmentDeleteModal({
  open,
  environment,
  onClose,
  onConfirm,
  deleting = false,
  error = null,
}) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !deleting) {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, deleting])

  if (!open || !environment) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={deleting ? undefined : onClose}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-environment-title"
        aria-describedby="delete-environment-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="delete-environment-title" className={styles.title}>
            Delete Environment?
          </h2>
        </header>

        <div className={styles.body}>
          <p id="delete-environment-message" className={styles.hint}>
            This will remove <strong>{environment.name}</strong> from the project. This cannot be
            undone.
          </p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Environment'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
