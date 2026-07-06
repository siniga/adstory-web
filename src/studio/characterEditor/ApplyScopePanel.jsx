import { APPLY_SCOPE_VISUALS } from './characterEditorVisuals'
import styles from './ApplyScopePanel.module.css'

export default function ApplyScopePanel({ value, onChange }) {
  return (
    <section className={styles.panel} aria-label="Apply changes scope">
      <h3 className={styles.title}>Apply Changes To</h3>
      <div className={styles.grid}>
        {APPLY_SCOPE_VISUALS.map((option) => {
          const selected = value === option.id
          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.scopeCard} ${selected ? styles.scopeCardActive : ''}`}
              onClick={() => onChange(option.id)}
              aria-pressed={selected}
            >
              <span className={styles.scopeIcon} aria-hidden="true">
                {option.icon}
              </span>
              <span className={styles.scopeLabel}>{option.label}</span>
              <span className={styles.scopeDetail}>{option.detail}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
