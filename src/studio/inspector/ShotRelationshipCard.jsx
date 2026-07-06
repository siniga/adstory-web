import styles from './ShotRelationshipCard.module.css'

export default function ShotRelationshipCard({ characterCount, environmentCount, objectCount }) {
  return (
    <section className={styles.card} aria-label="Shot relationships">
      <p className={styles.summary}>
        Uses{' '}
        <span className={styles.count}>{characterCount}</span> characters,{' '}
        <span className={styles.count}>{environmentCount}</span> environment,{' '}
        <span className={styles.count}>{objectCount}</span> objects
      </p>
    </section>
  )
}
