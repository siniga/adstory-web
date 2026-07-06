import styles from './ApplyScopeModal.module.css'

export default function ImpactPreviewCard({ impact }) {
  return (
    <section className={styles.impactCard} aria-label="Impact preview">
      <h4 className={styles.sectionTitle}>This change will affect:</h4>
      <ul className={styles.impactList}>
        <li>{impact.characters} character{impact.characters !== 1 ? 's' : ''}</li>
        <li>{impact.scenes} scene{impact.scenes !== 1 ? 's' : ''}</li>
        <li>{impact.shots} shot{impact.shots !== 1 ? 's' : ''}</li>
        <li>{impact.frames} frame{impact.frames !== 1 ? 's' : ''}</li>
      </ul>
    </section>
  )
}
