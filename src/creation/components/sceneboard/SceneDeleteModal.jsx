import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import modalStyles from '../CharacterModal.module.css'

export default function SceneDeleteModal({
  open,
  scene,
  hasShots = false,
  deleting = false,
  error = null,
  onClose,
  onConfirm,
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

  if (!open || !scene) return null

  const sceneLabel = scene.title?.trim() || `Scene ${scene.scene_number ?? ''}`

  return createPortal(
    <div className={modalStyles.overlay} role="presentation" onClick={deleting ? undefined : onClose}>
      <div
        className={modalStyles.panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-scene-title"
        aria-describedby="delete-scene-message"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={modalStyles.header}>
          <h2 id="delete-scene-title" className={modalStyles.title}>
            Delete Scene?
          </h2>
        </header>

        <div className={modalStyles.body}>
          <p id="delete-scene-message" className={modalStyles.hint}>
            {hasShots ? (
              <>
                This scene already has shots. Deleting it will delete its shots too. Are you sure
                you want to delete <strong>{sceneLabel}</strong>? This cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete <strong>{sceneLabel}</strong>? This cannot be
                undone.
              </>
            )}
          </p>
          {error ? <p className={modalStyles.error}>{error}</p> : null}
        </div>

        <footer className={modalStyles.footer}>
          <button type="button" className={modalStyles.cancelBtn} onClick={onClose} disabled={deleting}>
            Cancel
          </button>
          <button type="button" className={modalStyles.deleteBtn} onClick={onConfirm} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Scene'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
