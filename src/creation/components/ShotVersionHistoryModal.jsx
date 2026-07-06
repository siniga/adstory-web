import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getShotVersionImageUrl } from '../../utils/resolveMediaUrl'
import styles from './CharacterModal.module.css'
import shotStyles from './StepLayout.module.css'

function sortVersionsNewestFirst(versions = []) {
  return [...versions].sort(
    (a, b) => (b.version_number ?? 0) - (a.version_number ?? 0)
  )
}

function formatStatusLabel(status) {
  const normalized = String(status ?? '').trim().toLowerCase()
  if (!normalized) return 'Unknown'
  if (normalized === 'completed') return 'Completed'
  if (normalized === 'failed') return 'Failed'
  if (normalized === 'pending') return 'Pending'
  return status
}

export default function ShotVersionHistoryModal({
  open,
  shot,
  onClose,
  onApprove,
  onDelete,
  onPreviewImage,
  approvingImageId = null,
  deletingImageId = null,
  error = null,
  formatDate,
}) {
  const [localError, setLocalError] = useState(null)

  useEffect(() => {
    if (open) {
      setLocalError(null)
    }
  }, [open, shot?.id])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !approvingImageId && !deletingImageId) {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [approvingImageId, deletingImageId, onClose, open])

  const versions = useMemo(
    () => sortVersionsNewestFirst(shot?.shot_images ?? []),
    [shot?.shot_images]
  )

  if (!open || !shot) return null

  const handleApprove = async (version) => {
    setLocalError(null)
    try {
      await onApprove?.(version)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve version'
      setLocalError(message)
    }
  }

  const handleDelete = async (version) => {
    setLocalError(null)
    try {
      await onDelete?.(version)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete version'
      setLocalError(message)
    }
  }

  const displayError = error ?? localError
  const shotLabel = shot.title?.trim() || `Shot ${shot.shot_number ?? shot.id}`
  const isBusy = Boolean(approvingImageId || deletingImageId)

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={isBusy ? undefined : onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shot-version-history-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="shot-version-history-title" className={styles.title}>
            Versions — {shotLabel}
          </h2>
        </header>

        <div className={styles.body}>
          {!versions.length ? (
            <p className={styles.hint}>No generated versions yet.</p>
          ) : (
            <div className={shotStyles.shotVersionList}>
              {versions.map((version) => {
                const imageUrl = getShotVersionImageUrl(version)
                const isApproved = Boolean(version.is_approved)
                const isApproving = String(approvingImageId) === String(version.id)
                const isDeleting = String(deletingImageId) === String(version.id)

                return (
                  <article key={version.id ?? version.version_number} className={shotStyles.shotVersionRow}>
                    <div className={shotStyles.shotVersionMeta}>
                      <h3 className={shotStyles.shotVersionLabel}>
                        Version {version.version_number}
                        {isApproved ? (
                          <span className={shotStyles.shotVersionApprovedBadge}>Approved</span>
                        ) : null}
                      </h3>
                      <p className={shotStyles.shotVersionDate}>
                        {formatDate ? formatDate(version.created_at) : version.created_at}
                      </p>
                      <p className={shotStyles.shotImageStatus}>
                        Status: {formatStatusLabel(version.status)}
                      </p>
                    </div>
                    {imageUrl ? (
                      <button
                        type="button"
                        className={shotStyles.shotVersionThumbBtn}
                        onClick={() =>
                          onPreviewImage?.({
                            imageUrl,
                            title: `${shotLabel} — Version ${version.version_number}`,
                          })
                        }
                        aria-label={`View version ${version.version_number}`}
                      >
                        <img
                          src={imageUrl}
                          alt={`Version ${version.version_number}`}
                          className={shotStyles.shotVersionThumb}
                        />
                      </button>
                    ) : (
                      <div className={shotStyles.shotVersionThumbPlaceholder} aria-hidden="true" />
                    )}
                    <div className={shotStyles.shotVersionActions}>
                      {!isApproved ? (
                        <button
                          type="button"
                          className={shotStyles.shotImageBtn}
                          onClick={() => handleApprove(version)}
                          disabled={isBusy}
                        >
                          {isApproving ? 'Approving...' : 'Approve'}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={shotStyles.shotImageBtnDanger}
                        onClick={() => handleDelete(version)}
                        disabled={isBusy}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          {displayError ? <p className={styles.error}>{displayError}</p> : null}
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isBusy}>
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
