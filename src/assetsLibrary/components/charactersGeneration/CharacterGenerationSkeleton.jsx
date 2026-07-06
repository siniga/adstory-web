import styles from './CharacterGenerationSkeleton.module.css'

function SkeletonRow() {
  return (
    <div className={styles.row}>
      <div className={styles.characterCell}>
        <span className={`${styles.block} ${styles.avatar}`} />
        <div className={styles.textGroup}>
          <span className={`${styles.block} ${styles.name}`} />
          <span className={`${styles.block} ${styles.role}`} />
        </div>
      </div>
      <span className={`${styles.block} ${styles.status}`} />
      <span className={`${styles.block} ${styles.chevron}`} />
    </div>
  )
}

export default function CharacterGenerationSkeleton({ rowCount = 4 }) {
  return (
    <div className={styles.skeleton} aria-busy="true" aria-label="Loading characters">
      <div className={styles.header}>
        <span className={`${styles.block} ${styles.title}`} />
        <span className={`${styles.block} ${styles.subtitle}`} />
        <span className={`${styles.block} ${styles.progressTrack}`} />
        <div className={styles.progressMeta}>
          <span className={`${styles.block} ${styles.progressCount}`} />
          <span className={`${styles.block} ${styles.progressPercent}`} />
        </div>
      </div>

      <div className={styles.list}>
        {Array.from({ length: rowCount }, (_, index) => (
          <SkeletonRow key={index} />
        ))}
      </div>
    </div>
  )
}
