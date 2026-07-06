import styles from './GenerateButton.module.css'

export default function GenerateButton({
  label = 'Generate',
  onClick,
  disabled = false,
  loading = false,
  variant = 'row',
}) {
  const isRegenerate = label === 'Regenerate'

  return (
    <button
      type="button"
      className={`${styles.btn} ${variant === 'primary' ? styles.btnPrimary : styles.btnRow} ${isRegenerate ? styles.btnRowRegenerate : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : null}
      <span>{loading ? 'Generating...' : label}</span>
    </button>
  )
}
