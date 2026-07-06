import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ErrorModal.module.css'

export default function ErrorModal({ open, title, message, onClose }) {
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

  if (!open || !message) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="error-modal-title"
        aria-describedby="error-modal-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <span className={styles.icon} aria-hidden="true">
            !
          </span>
          <h2 id="error-modal-title" className={styles.title}>
            {title}
          </h2>
        </header>

        <div className={styles.body}>
          <p id="error-modal-message" className={styles.message}>
            {message}
          </p>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.dismissBtn} onClick={onClose}>
            Got it
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
