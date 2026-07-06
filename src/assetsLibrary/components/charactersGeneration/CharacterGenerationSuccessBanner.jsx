import styles from './CharacterGenerationSuccessBanner.module.css'

export default function CharacterGenerationSuccessBanner() {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.icon} aria-hidden="true">
        ✓
      </span>
      <div>
        <p className={styles.title}>Character generation complete</p>
        <p className={styles.subtitle}>All character identities are ready.</p>
      </div>
    </div>
  )
}
