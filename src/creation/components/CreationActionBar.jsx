import stepStyles from './StepLayout.module.css'
import styles from './CreationActionBar.module.css'

export default function CreationActionBar({ action, generating, progressPct = 0 }) {
  if (!action) {
    return null
  }

  const loadingLabel = action.generatingLabel ?? 'Generating…'

  return (
    <footer className={styles.dock}>
      <div className={styles.dockLeft}>
        {action.secondaryAction ? (
          <button
            type="button"
            className={stepStyles.secondaryBtnActive}
            onClick={action.secondaryAction.onClick}
            disabled={generating || action.secondaryAction.disabled}
          >
            {action.secondaryAction.label}
          </button>
        ) : null}
      </div>
      <div className={styles.dockCenter}>
        <span className={styles.progressLabel}>Project Progress</span>
        <div className={styles.progressTrack}>
          <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
        </div>
        <span className={styles.progressPct}>{progressPct}%</span>
      </div>
      <div className={styles.dockRight}>
        <button
          type="button"
          className={stepStyles.primaryBtn}
          onClick={action.onClick}
          disabled={generating || action.disabled}
        >
          {generating ? (
            <>
              <span className={styles.spinner} aria-hidden="true" />
              <span>{loadingLabel}</span>
            </>
          ) : (
            action.label
          )}
        </button>
      </div>
    </footer>
  )
}
