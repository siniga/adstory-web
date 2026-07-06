import {
  deriveProgressPercent,
  estimateTimeRemaining,
  formatEstimatedSecondsRemaining,
  formatEstimatedTimeRemaining,
  isGenerationInProgress,
} from '../../aiGenerationStatus'
import styles from './GenerationProgress.module.css'

export default function GenerationProgress({
  progress,
  startedAt,
  activeLabel = 'Generating…',
  currentLabel,
  compact = false,
  showStats = true,
}) {
  if (!progress) return null

  const { total, completed, failed, status } = progress
  const isActive = isGenerationInProgress(status)
  const remaining = progress.remaining ?? Math.max(0, total - completed - failed)
  const percent = deriveProgressPercent({
    progress_percent: progress.progress_percent,
    completed,
    failed,
    total,
    status,
  })

  const etaMs = estimateTimeRemaining({ completed, total, failed, startedAt })
  const etaFromBackend = formatEstimatedSecondsRemaining(progress.estimated_remaining_seconds)
  const etaLabel = etaFromBackend ?? formatEstimatedTimeRemaining(etaMs)

  const currentScene = progress.currentScene
  const currentText =
    currentLabel ??
    (currentScene
      ? `Current Scene ${currentScene.scene_number ?? completed + 1} of ${total || '—'}`
      : total > 0
        ? `Scene ${Math.min(completed + 1, total)} of ${total}`
        : null)

  if (!isActive && total === 0 && percent === 0) {
    return null
  }

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ''}`} aria-live="polite">
      {isActive ? (
        <p className={styles.activeLabel}>{activeLabel}</p>
      ) : null}

      {total > 0 || percent > 0 ? (
        <>
          <div className={styles.track} aria-hidden="true">
            <div
              className={`${styles.fill} ${isActive ? styles.fillActive : ''}`}
              style={{ width: `${Math.max(percent, isActive ? 4 : 0)}%` }}
            />
          </div>
          <p className={styles.percent}>{percent}%</p>
        </>
      ) : null}

      {currentText && isActive ? <p className={styles.current}>{currentText}</p> : null}

      {showStats && (total > 0 || isActive) ? (
        <dl className={styles.stats}>
          <div>
            <dt>Completed</dt>
            <dd>{completed}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{remaining}</dd>
          </div>
          {(failed ?? 0) > 0 ? (
            <div>
              <dt>Failed</dt>
              <dd>{failed}</dd>
            </div>
          ) : null}
          {etaLabel && isActive ? (
            <div className={styles.eta}>
              <dt>ETA</dt>
              <dd>{etaLabel}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  )
}
