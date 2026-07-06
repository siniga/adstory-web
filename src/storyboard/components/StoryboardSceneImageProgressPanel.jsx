import {
  formatStoryboardEstimatedRemaining,
} from '../storyboardWorkspaceStatus'
import styles from '../ProjectStoryboard.module.css'

function ProgressStats({ progress }) {
  const completed = progress?.completed ?? 0
  const remaining = progress?.remaining ?? 0
  const failed = progress?.failed ?? 0
  const currentShot = progress?.currentShot
  const estimatedRemaining = formatStoryboardEstimatedRemaining(progress?.estimated_remaining)

  return (
    <div className={styles.sceneImageProgressStats}>
      <div className={styles.sceneImageProgressStat}>
        <span className={styles.sceneImageProgressStatLabel}>Completed</span>
        <span className={styles.sceneImageProgressStatValue}>{completed}</span>
      </div>
      <div className={styles.sceneImageProgressStat}>
        <span className={styles.sceneImageProgressStatLabel}>Remaining</span>
        <span className={styles.sceneImageProgressStatValue}>{remaining}</span>
      </div>
      <div className={styles.sceneImageProgressStat}>
        <span className={styles.sceneImageProgressStatLabel}>Failed</span>
        <span className={styles.sceneImageProgressStatValue}>{failed}</span>
      </div>
      <div className={styles.sceneImageProgressStat}>
        <span className={styles.sceneImageProgressStatLabel}>Current Shot</span>
        <span className={styles.sceneImageProgressStatValue}>
          {currentShot?.title ??
            (currentShot?.shot_number != null ? `Shot ${currentShot.shot_number}` : '—')}
        </span>
      </div>
      <div className={styles.sceneImageProgressStat}>
        <span className={styles.sceneImageProgressStatLabel}>Estimated Remaining</span>
        <span className={styles.sceneImageProgressStatValue}>{estimatedRemaining}</span>
      </div>
    </div>
  )
}

export default function StoryboardSceneImageProgressPanel({
  progress,
  starting = false,
  resuming = false,
  generationActive = false,
  generationComplete = false,
  stalled = false,
  slowProgress = false,
  hasShots = false,
  onGenerateAll,
  onResume,
  onKeepWaiting,
  onCancel,
  cancelling = false,
}) {
  if (!hasShots) return null

  const percent = Math.min(100, Math.max(0, progress?.progress_percent ?? 0))
  const completed = progress?.completed ?? 0
  const total = progress?.total ?? 0
  const failed = progress?.failed ?? 0

  if (stalled) {
    return (
      <section className={styles.sceneImageProgressCard} aria-live="polite">
        <p className={styles.sceneImageProgressTitle}>Generation Paused</p>
        <p className={styles.sceneImageProgressCount}>
          {completed} / {total || '—'} images completed.
        </p>
        <p className={styles.sceneImageProgressHint}>Generation appears to have stopped.</p>
        <div className={styles.sceneImageProgressActions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={onResume}
            disabled={resuming || cancelling}
          >
            {resuming ? 'Resuming…' : 'Resume Generation'}
          </button>
          {onCancel ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          ) : null}
        </div>
      </section>
    )
  }

  if (generationActive) {
    return (
      <section className={styles.sceneImageProgressCard} aria-live="polite">
        <p className={styles.sceneImageProgressTitle}>
          {slowProgress ? 'Generation taking longer than expected…' : 'Generating images…'}
        </p>
        <div className={styles.progressBarTrack} aria-hidden="true">
          <div className={styles.progressBarFill} style={{ width: `${percent}%` }} />
        </div>
        <ProgressStats progress={progress} />
        <div className={styles.sceneImageProgressActions}>
          {onCancel ? (
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel'}
            </button>
          ) : null}
          {slowProgress ? (
            <>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={onResume}
                disabled={resuming || cancelling}
              >
                {resuming ? 'Resuming…' : 'Resume'}
              </button>
              <button type="button" className={styles.secondaryBtn} onClick={onKeepWaiting}>
                Keep Waiting
              </button>
            </>
          ) : null}
        </div>
      </section>
    )
  }

  if (generationComplete && total > 0 && completed + failed >= total) {
    return (
      <section className={styles.sceneImageProgressCard}>
        <p className={styles.sceneImageComplete}>✓ All images generated</p>
        <button type="button" className={styles.primaryBtn} onClick={onGenerateAll}>
          Regenerate Scene Images
        </button>
      </section>
    )
  }

  return (
    <section className={styles.sceneImageProgressCard}>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onGenerateAll}
        disabled={starting}
      >
        {starting ? 'Starting…' : 'Generate All Images'}
      </button>
    </section>
  )
}
