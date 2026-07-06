import styles from './AssetWorkflowFooter.module.css'

export default function AssetWorkflowFooter({
  backLabel = 'Back',
  onBack,
  continueLabel,
  onContinue,
  continueDisabled = false,
  continueLoading = false,
}) {
  return (
    <footer className={styles.footer}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        {backLabel}
      </button>
      <button
        type="button"
        className={`${styles.continueBtn} ${continueDisabled ? '' : styles.continueBtnActive}`}
        onClick={onContinue}
        disabled={continueDisabled || continueLoading}
      >
        {continueLoading ? 'Continuing…' : continueLabel}
      </button>
    </footer>
  )
}
