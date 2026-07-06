import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import modalStyles from './AssetAssignmentModal.module.css'
import styles from './ShotPromptModal.module.css'

export default function ShotPromptModal({ open, shotLabel, prompt, onClose }) {
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

  if (!open) return null

  const hasPrompt = Boolean(prompt?.trim())

  return createPortal(
    <div className={modalStyles.overlay} role="presentation" onClick={onClose}>
      <div
        className={`${modalStyles.modal} ${styles.modalWide}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shot-prompt-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={modalStyles.header}>
          <div>
            <h2 id="shot-prompt-title" className={modalStyles.title}>
              Shot Prompt
            </h2>
            {shotLabel ? <p className={modalStyles.subtitle}>{shotLabel}</p> : null}
          </div>
          <button type="button" className={modalStyles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          {hasPrompt ? (
            <pre className={styles.promptBody}>{prompt}</pre>
          ) : (
            <p className={styles.emptyPrompt}>No prompt available for this shot yet.</p>
          )}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.closeFooterBtn} onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
