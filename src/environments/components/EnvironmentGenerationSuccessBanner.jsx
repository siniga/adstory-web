import styles from './EnvironmentGenerationSuccessBanner.module.css'

export default function EnvironmentGenerationSuccessBanner() {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.icon} aria-hidden="true">
        ✓
      </span>
      <div>
        <p className={styles.title}>Environment generation complete</p>
        <p className={styles.subtitle}>All story locations are ready.</p>
      </div>
    </div>
  )
}
