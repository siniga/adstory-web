import styles from './CharacterIdentityProgressPanel.module.css'

export default function CharacterIdentityProgressPanel({
  isRunning = false,
  isAllCompleted = false,
  hasFailures = false,
  progressPercent = 0,
  completed = 0,
  total = 0,
  currentCharacter = null,
  queueNotice = null,
  onRetryFailed,
  retrying = false,
}) {
  if (!isRunning && !isAllCompleted && !hasFailures) {
    return null
  }

  if (isAllCompleted && !hasFailures && !isRunning) {
    return (
      <div className={`${styles.panel} ${styles.panelSuccess}`}>
        <p className={styles.title}>✔ Character generation complete.</p>
        <p className={styles.subtitle}>All character identities are ready.</p>
      </div>
    )
  }

  if (!isRunning && hasFailures) {
    return (
      <div className={`${styles.panel} ${styles.panelWarning}`}>
        <p className={styles.title}>Some characters could not be generated.</p>
        <p className={styles.subtitle}>You can retry them or continue.</p>
        {onRetryFailed ? (
          <button
            type="button"
            className={styles.retryBtn}
            onClick={onRetryFailed}
            disabled={retrying}
          >
            {retrying ? 'Retrying…' : 'Retry Failed'}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.panel}>
      <p className={styles.title}>We&apos;re building the characters for your story.</p>
      <p className={styles.subtitle}>
        Screenly is creating each character&apos;s hero image and key reference views. This helps
        keep your storyboard consistent.
      </p>

      <div className={styles.progressMeta}>
        <span className={styles.progressCount}>
          {completed} of {total} characters completed
        </span>
        <span className={styles.progressPercent}>{progressPercent}%</span>
      </div>

      <div className={styles.progressTrack} aria-hidden="true">
        <span
          className={styles.progressFill}
          style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
        />
      </div>

      {isRunning ? <span className={styles.spinner} aria-hidden="true" /> : null}

      {currentCharacter?.name ? (
        <p className={styles.currentCharacter}>
          Building identity for <strong>{currentCharacter.name}</strong>
        </p>
      ) : null}

      {queueNotice ? <p className={styles.queueNotice}>{queueNotice}</p> : null}

      {hasFailures && onRetryFailed ? (
        <button
          type="button"
          className={styles.retryBtn}
          onClick={onRetryFailed}
          disabled={retrying || isRunning}
        >
          {retrying ? 'Retrying…' : 'Retry Failed'}
        </button>
      ) : null}
    </div>
  )
}
