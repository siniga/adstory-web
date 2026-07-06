import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from '../../creation/components/CharacterModal.module.css'

export default function ReassignAssetsModal({
  open,
  onUseExisting,
  onReassign,
  confirming = false,
  error = null,
}) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !confirming) {
        onUseExisting()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onUseExisting, confirming])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={confirming ? undefined : onUseExisting}>
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="reassign-assets-title"
        aria-describedby="reassign-assets-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="reassign-assets-title" className={styles.title}>
            Reassign assets?
          </h2>
        </header>

        <div className={styles.body}>
          <p id="reassign-assets-message" className={styles.hint}>
            Reassign assets using the latest accepted characters, environments, and objects?
          </p>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onUseExisting} disabled={confirming}>
            Use Existing
          </button>
          <button type="button" className={styles.saveBtn} onClick={onReassign} disabled={confirming}>
            {confirming ? 'Assigning…' : 'Reassign'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
