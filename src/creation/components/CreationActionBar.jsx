import stepStyles from './StepLayout.module.css'
import styles from './CreationActionBar.module.css'

export default function CreationActionBar({ action, generating }) {
  if (!action) {
    return null
  }

  const loadingLabel = action.generatingLabel ?? 'Generating…'
  const hasPrimary = Boolean(action.label && action.onClick)
  const hasSecondary = Boolean(action.secondaryAction)

  if (!hasPrimary && !hasSecondary) {
    return null
  }

  return (
    <footer className={styles.dock}>
      <div className={styles.dockLeft}>
        {hasSecondary ? (
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
      {hasPrimary ? (
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
      ) : null}
    </footer>
  )
}
