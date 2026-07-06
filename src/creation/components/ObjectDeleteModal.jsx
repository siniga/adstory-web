import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './CharacterModal.module.css'

export default function ObjectDeleteModal({
  open,
  object,
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

  if (!open || !object) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={deleting ? undefined : onClose}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-object-title"
        aria-describedby="delete-object-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="delete-object-title" className={styles.title}>
            Delete Object?
          </h2>
        </header>

        <div className={styles.body}>
          <p id="delete-object-message" className={styles.hint}>
            This will remove <strong>{object.name}</strong> from the project. This cannot be undone.
          </p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Object'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
