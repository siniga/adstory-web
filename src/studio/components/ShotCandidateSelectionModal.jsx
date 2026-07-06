import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../icons'
import { resolveCandidateImageSrc } from '../shotCandidates'
import styles from './ShotCandidateSelectionModal.module.css'

export default function ShotCandidateSelectionModal({
  open,
  candidates = [],
  onClose,
  onSelect,
  onRegenerateOptions,
  selecting = false,
  regeneratingOptions = false,
  error = null,
}) {
  const [imageErrors, setImageErrors] = useState({})
  const isBusy = selecting || regeneratingOptions

  useEffect(() => {
    setImageErrors({})
  }, [open, candidates])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, isBusy])

  if (!open || !candidates.length) return null

  const handleSelect = async (candidate) => {
    if (isBusy) return
    await onSelect?.(candidate.id)
  }

  const handleRegenerateOptions = async () => {
    if (isBusy || !onRegenerateOptions) return
    await onRegenerateOptions()
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={isBusy ? undefined : onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shot-candidate-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 id="shot-candidate-title" className={styles.title}>
              Choose Shot Version
            </h2>
            <p className={styles.subtitle}>Select the version to use for this shot.</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          {error ? <p className={styles.error}>{error}</p> : null}
          <div className={styles.cards}>
            {candidates.map((candidate) => {
              const imageSrc = resolveCandidateImageSrc(candidate)
              const imageFailed = Boolean(imageErrors[candidate.id])

              return (
                <article key={`${candidate.id}-${candidate.updatedAt ?? ''}`} className={styles.card}>
                  <h3 className={styles.cardLabel}>{candidate.label}</h3>
                  <div className={styles.preview}>
                    {imageSrc && !imageFailed ? (
                      <img
                        className={styles.previewImage}
                        src={imageSrc}
                        alt={candidate.label}
                        onError={() =>
                          setImageErrors((current) => ({ ...current, [candidate.id]: true }))
                        }
                      />
                    ) : (
                      <div className={styles.previewFallback} aria-hidden="true" />
                    )}
                  </div>
                  <button
                    type="button"
                    className={styles.selectBtn}
                    onClick={() => handleSelect(candidate)}
                    disabled={isBusy}
                  >
                    {selecting ? 'Selecting…' : 'Select This Version'}
                  </button>
                </article>
              )
            })}
          </div>
        </div>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          {onRegenerateOptions ? (
            <button
              type="button"
              className={styles.regenerateBtn}
              onClick={handleRegenerateOptions}
              disabled={isBusy}
            >
              {regeneratingOptions ? 'Regenerating options…' : 'Regenerate Options'}
            </button>
          ) : null}
        </footer>
      </div>
    </div>,
    document.body
  )
}
