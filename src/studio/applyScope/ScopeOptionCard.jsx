import { getScopeDetail } from './applyScopeData'
import styles from './ApplyScopeModal.module.css'

export default function ScopeOptionCard({ option, selected, context, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.scopeCard} ${selected ? styles.scopeCardActive : ''}`}
      onClick={() => onSelect(option.id)}
      aria-pressed={selected}
    >
      <span className={styles.scopeRadio} aria-hidden="true" />
      <span className={styles.scopeCardBody}>
        <span className={styles.scopeLabel}>{option.label}</span>
        <span className={styles.scopeDetail}>{getScopeDetail(option.id, context)}</span>
      </span>
    </button>
  )
}
