import styles from './EnvironmentGenerationHeader.module.css'

export default function EnvironmentGenerationHeader({
  completed = 0,
  total = 0,
  progressPercent = 0,
}) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>We&apos;re building the environments for your story</h1>
      <p className={styles.subtitle}>
        Screenly is creating the key locations and visual atmosphere for your storyboard.
      </p>

      <div className={styles.progressBlock}>
        <div className={styles.progressTrack} aria-hidden="true">
          <span
            className={styles.progressFill}
            style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
          />
        </div>
        <div className={styles.progressMeta}>
          <span className={styles.progressCount}>
            {completed} of {total} environments completed
          </span>
          <span className={styles.progressPercent}>{progressPercent}%</span>
        </div>
      </div>
    </header>
  )
}
