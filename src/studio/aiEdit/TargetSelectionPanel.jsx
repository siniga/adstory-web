import { TARGET_OPTIONS } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function TargetSelectionPanel({ value, onChange }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Apply To</h4>
      <div className={styles.targetList}>
        {TARGET_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`${styles.targetOption} ${value === option.id ? styles.targetOptionActive : ''}`}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
          >
            <span className={styles.targetRadio} aria-hidden="true" />
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
