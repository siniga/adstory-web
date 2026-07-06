import CharacterGenerationStatusBadge from './CharacterGenerationStatusBadge'
import styles from './CharacterGenerationPendingRow.module.css'

export default function CharacterGenerationPendingRow() {
  return (
    <div className={styles.rowWrap}>
      <div className={`${styles.row} ${styles.rowCurrent}`}>
        <div className={styles.characterCell}>
          <span className={styles.avatar} aria-hidden="true">
            <span className={styles.avatarSpinner} />
          </span>
          <div className={styles.characterMeta}>
            <span className={styles.name}>Creating next character...</span>
          </div>
        </div>

        <div className={styles.statusCell}>
          <CharacterGenerationStatusBadge tone="creating" label="Creating..." />
        </div>
      </div>
    </div>
  )
}
