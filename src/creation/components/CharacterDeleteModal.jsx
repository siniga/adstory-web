import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './CharacterModal.module.css'

export default function CharacterDeleteModal({
  open,
  character,
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

  if (!open || !character) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={deleting ? undefined : onClose}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-character-title"
        aria-describedby="delete-character-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="delete-character-title" className={styles.title}>
            Delete Character?
          </h2>
        </header>

        <div className={styles.body}>
          <p id="delete-character-message" className={styles.hint}>
            This will remove <strong>{character.name}</strong> from the project and any shot
            assignments. This cannot be undone.
          </p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Character'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
