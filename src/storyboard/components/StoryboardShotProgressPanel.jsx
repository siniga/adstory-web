import styles from '../ProjectStoryboard.module.css'

export default function StoryboardShotProgressPanel({
  progress,
  onCancel,
  cancelling = false,
}) {
  if (!progress) return null

  const percent = progress.progress_percent ?? 0

  return (
    <section className={styles.progressCard} aria-live="polite">
      <h3 className={styles.progressTitle}>Generating storyboard shots…</h3>
      <div className={styles.progressBarTrack} aria-hidden="true">
        <div className={styles.progressBarFill} style={{ width: `${percent}%` }} />
      </div>
      <div className={styles.progressStats}>
        <div>
          <span className={styles.progressStatLabel}>Completed</span>
          <span className={styles.progressStatValue}>{progress.completed ?? 0}</span>
        </div>
        <div>
          <span className={styles.progressStatLabel}>Remaining</span>
          <span className={styles.progressStatValue}>{progress.remaining ?? 0}</span>
        </div>
        <div>
          <span className={styles.progressStatLabel}>Failed</span>
          <span className={styles.progressStatValue}>{progress.failed ?? 0}</span>
        </div>
      </div>
      {progress.currentShot ? (
        <p className={styles.progressCurrentShot}>
          Current shot: {progress.currentShot.title ?? progress.currentShot.shot_number ?? '—'}
        </p>
      ) : null}
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
    </section>
  )
}
