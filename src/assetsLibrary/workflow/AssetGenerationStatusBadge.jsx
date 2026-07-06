import styles from './AssetGenerationStatusBadge.module.css'

function CheckIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 8.25 6.5 11.25 12.5 4.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.5 14 13.5H2L8 2.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M8 6.25V9" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      <circle cx="8" cy="11.1" r="0.75" fill="currentColor" />
    </svg>
  )
}

export default function AssetGenerationStatusBadge({ tone = 'not_generated', label }) {
  const showSpinner = tone === 'generating'

  return (
    <span className={`${styles.badge} ${styles[tone] ?? styles.not_generated}`}>
      {showSpinner ? <span className={styles.spinner} aria-hidden="true" /> : null}
      {tone === 'completed' ? <CheckIcon /> : null}
      {tone === 'failed' ? <WarningIcon /> : null}
      <span>{label}</span>
    </span>
  )
}
