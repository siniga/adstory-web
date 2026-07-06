import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './DeleteProjectConfirmModal.module.css'

const CONFIRM_MESSAGE =
  'Are you sure you want to delete this project? This will delete the story, script, screenplay, scenes, shots, characters, environments, storyboard images, and generated assets. This action cannot be undone.'

export default function DeleteProjectConfirmModal({
  open,
  projectTitle,
  deleting = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !deleting) {
        onCancel()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, deleting, onCancel])

  if (!open) return null

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={deleting ? undefined : onCancel}
    >
      <div
        className={styles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-project-modal-title"
        aria-describedby="delete-project-modal-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="delete-project-modal-title" className={styles.title}>
            Delete project
          </h2>
        </header>

        <div className={styles.body}>
          {projectTitle ? (
            <p className={styles.projectName}>
              <strong>{projectTitle}</strong>
            </p>
          ) : null}
          <p id="delete-project-modal-message" className={styles.message}>
            {CONFIRM_MESSAGE}
          </p>
        </div>

        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
