import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { STORYBOARD_PIPELINE_PHASES } from './runStoryboardGenerationPipeline'
import styles from '../../creation/pipeline/GenerationPipelineModal.module.css'

function phaseState(phaseId, currentPhaseId, currentStatus, errorPhaseId) {
  const order = STORYBOARD_PIPELINE_PHASES.map((p) => p.id)
  const currentIndex = order.indexOf(currentPhaseId)
  const phaseIndex = order.indexOf(phaseId)

  if (errorPhaseId && phaseId === errorPhaseId) return 'error'
  if (currentStatus === 'complete' || currentStatus === 'done') {
    if (phaseIndex <= currentIndex) return 'done'
  }
  if (phaseIndex < currentIndex) return 'done'
  if (phaseId === currentPhaseId) return 'current'
  return 'pending'
}

export default function StoryboardGenerationPipelineModal({
  open,
  phaseId,
  percent = 0,
  message = '',
  status = 'running',
  error = null,
  onClose,
  onContinue,
}) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && (error || status === 'complete')) {
        onClose?.()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, error, status, onClose])

  const phases = useMemo(() => {
    const errorPhaseId = error ? phaseId : null
    return STORYBOARD_PIPELINE_PHASES.map((phase) => ({
      ...phase,
      state: phaseState(phase.id, phaseId, status, errorPhaseId),
    }))
  }, [phaseId, status, error])

  if (!open) return null

  const isComplete = status === 'complete' && !error
  const canDismiss = Boolean(error) || isComplete
  const clampedPercent = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)))
  const currentTitle =
    STORYBOARD_PIPELINE_PHASES.find((phase) => phase.id === phaseId)?.title ?? 'Storyboard'

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={canDismiss ? onClose : undefined}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="storyboard-pipeline-title"
        aria-describedby="storyboard-pipeline-subtitle"
        onClick={(event) => event.stopPropagation()}
      >
        {canDismiss ? (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}

        <div className={styles.hero}>
          <div
            className={`${styles.statusIcon} ${error ? styles.statusIconError : ''} ${isComplete ? styles.statusIconDone : ''}`}
            aria-hidden="true"
          >
            {error ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v5M12 16.5h.01" strokeLinecap="round" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            ) : isComplete ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <span className={styles.spinner} />
            )}
          </div>
          <h2 id="storyboard-pipeline-title" className={styles.title}>
            {error
              ? 'Storyboard generation paused'
              : isComplete
                ? 'Storyboard ready'
                : 'Generating storyboard'}
          </h2>
          <p id="storyboard-pipeline-subtitle" className={styles.subtitle}>
            {error
              ? error
              : isComplete
                ? 'Shots and images are ready. Review each scene when you like.'
                : message || `Working on ${currentTitle}…`}
          </p>
        </div>

        <div className={styles.progressBlock} aria-live="polite">
          <div className={styles.progressMeta}>
            <span>{isComplete ? 'All steps' : currentTitle}</span>
            <span>{isComplete ? '100%' : `${clampedPercent}%`}</span>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={isComplete ? 100 : clampedPercent}
            aria-label={`${currentTitle} progress`}
          >
            <div
              className={styles.progressFill}
              style={{ width: `${isComplete ? 100 : clampedPercent}%` }}
            />
          </div>
        </div>

        <ol className={styles.timeline} aria-label="Storyboard generation steps">
          {phases.map((phase, index) => (
            <li
              key={phase.id}
              className={`${styles.step} ${styles[`step_${phase.state}`] ?? ''}`}
            >
              <div className={styles.rail} aria-hidden="true">
                <span className={styles.dot}>
                  {phase.state === 'done' ? '✓' : index + 1}
                </span>
                {index < phases.length - 1 ? <span className={styles.connector} /> : null}
              </div>
              <div className={styles.stepBody}>
                <div className={styles.stepHeader}>
                  <h3 className={styles.stepTitle}>{phase.title}</h3>
                  {phase.state === 'current' ? <span className={styles.badge}>Now</span> : null}
                  {phase.state === 'done' ? <span className={styles.badgeDone}>Done</span> : null}
                  {phase.state === 'error' ? <span className={styles.badgeError}>Failed</span> : null}
                </div>
                <p className={styles.stepDescription}>{phase.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.footer}>
          {error ? (
            <button type="button" className={styles.secondaryBtn} onClick={onClose}>
              Close
            </button>
          ) : isComplete ? (
            <button type="button" className={styles.primaryBtn} onClick={onContinue ?? onClose}>
              View Storyboard →
            </button>
          ) : (
            <p className={styles.footerHint}>
              Stay on this page — shots and images generate in the background.
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
