import CharacterGenerationStatusBadge from '../../assetsLibrary/components/charactersGeneration/CharacterGenerationStatusBadge'
import styles from './EnvironmentGenerationPendingRow.module.css'

export default function EnvironmentGenerationPendingRow() {
  return (
    <div className={styles.rowWrap}>
      <div className={`${styles.row} ${styles.rowCurrent}`}>
        <div className={styles.environmentCell}>
          <span className={styles.thumb} aria-hidden="true">
            <span className={styles.thumbSpinner} />
          </span>
          <div className={styles.meta}>
            <span className={styles.name}>Creating next environment...</span>
          </div>
        </div>

        <div className={styles.statusCell}>
          <CharacterGenerationStatusBadge tone="creating" label="Creating..." />
        </div>
      </div>
    </div>
  )
}
