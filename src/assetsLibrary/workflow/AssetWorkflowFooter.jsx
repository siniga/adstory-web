import styles from './AssetWorkflowFooter.module.css'

export default function AssetWorkflowFooter({
  backLabel = 'Back',
  onBack,
}) {
  return (
    <footer className={styles.footer}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        {backLabel}
      </button>
    </footer>
  )
}
