import styles from './ApplyScopeModal.module.css'

export default function ConsistencyWarningCard({ message }) {
  return (
    <div className={styles.warningCard} role="note">
      <span className={styles.warningIcon} aria-hidden="true">
        ⚠
      </span>
      <span className={styles.warningText}>{message}</span>
    </div>
  )
}
