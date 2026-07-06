import { QUICK_ACTIONS } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function QuickActionChips({ onSelect }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Quick Actions</h4>
      <div className={styles.chipGrid}>
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action}
            type="button"
            className={styles.chip}
            onClick={() => onSelect(action)}
          >
            {action}
          </button>
        ))}
      </div>
    </section>
  )
}
