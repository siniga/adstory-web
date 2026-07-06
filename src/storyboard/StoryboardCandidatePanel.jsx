import { useEffect, useState } from 'react'
import {
  getCandidateCameraDirection,
  getCandidateSlotLabel,
  resolveCandidateImageSrc,
} from '../studio/shotCandidates'
import styles from './StoryboardCandidatePanel.module.css'

export default function StoryboardCandidatePanel({
  candidates = [],
  selectedCandidateId = null,
  savedCandidateId = null,
  onSelectCandidate,
  onRegenerateCandidates,
  onSaveSelection,
  regenerating = false,
  saving = false,
  error = null,
}) {
  const [imageErrors, setImageErrors] = useState({})
  const isBusy = regenerating || saving
  const displayCandidates = candidates.slice(0, 2)

  useEffect(() => {
    setImageErrors({})
  }, [candidates])

  return (
    <section className={styles.panel} aria-label="Shot candidates">
      <div className={styles.heading}>
        <h2 className={styles.title}>Choose Shot Version</h2>
        <p className={styles.subtitle}>Select the version to use for this shot.</p>
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.cards}>
        {displayCandidates.length ? (
          displayCandidates.map((candidate, index) => {
            const imageSrc = resolveCandidateImageSrc(candidate)
            const imageFailed = Boolean(imageErrors[candidate.id])
            const isSelected =
              String(selectedCandidateId) === String(candidate.id) ||
              String(savedCandidateId) === String(candidate.id)
            const isSaved = String(savedCandidateId) === String(candidate.id)

            return (
              <article
                key={`${candidate.id}-${candidate.updatedAt ?? ''}`}
                className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
              >
                <div className={styles.cardHeader}>
                  <h3 className={styles.slotLabel}>{getCandidateSlotLabel(index)}</h3>
                  {isSaved ? <span className={styles.selectedBadge}>Selected</span> : null}
                  {isSelected && !isSaved ? (
                    <span className={styles.draftBadge}>Chosen</span>
                  ) : null}
                </div>

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

                <p className={styles.cameraDirection}>
                  {getCandidateCameraDirection(candidate.viewType, candidate.label)}
                </p>

                <button
                  type="button"
                  className={styles.selectBtn}
                  onClick={() => onSelectCandidate?.(candidate.id)}
                  disabled={isBusy}
                >
                  {saving ? 'Saving…' : `Select ${getCandidateSlotLabel(index)}`}
                </button>
              </article>
            )
          })
        ) : (
          <>
            <div className={styles.emptyCard}>
              <p className={styles.emptyText}>Candidate A</p>
              <p className={styles.emptyHint}>Generate candidates to preview options.</p>
            </div>
            <div className={styles.emptyCard}>
              <p className={styles.emptyText}>Candidate B</p>
              <p className={styles.emptyHint}>Generate candidates to preview options.</p>
            </div>
          </>
        )}
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.regenerateBtn}
          onClick={onRegenerateCandidates}
          disabled={isBusy || !onRegenerateCandidates}
        >
          {regenerating ? 'Regenerating options…' : 'Regenerate Candidates'}
        </button>
        <button
          type="button"
          className={styles.saveBtn}
          onClick={onSaveSelection}
          disabled={isBusy || !onSaveSelection}
        >
          {saving ? 'Saving…' : 'Save Selection'}
        </button>
      </div>
    </section>
  )
}
