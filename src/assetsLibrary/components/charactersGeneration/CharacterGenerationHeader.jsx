import styles from './CharacterGenerationHeader.module.css'

export default function CharacterGenerationHeader({
  completed = 0,
  total = 0,
  progressPercent = 0,
}) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>We&apos;re building the characters for your story</h1>
      <p className={styles.subtitle}>
        Screenly is creating your cast one character at a time.
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
            {completed} of {total} characters completed
          </span>
          <span className={styles.progressPercent}>{progressPercent}%</span>
        </div>
      </div>
    </header>
  )
}
