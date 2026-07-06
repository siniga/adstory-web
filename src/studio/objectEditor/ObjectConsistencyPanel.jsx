import { CONSISTENCY_OPTIONS } from './objectEditorVisuals'
import styles from './ObjectConsistencyPanel.module.css'

export default function ObjectConsistencyPanel({ consistency, onChange }) {
  const toggle = (key) => {
    onChange({ ...consistency, [key]: !consistency[key] })
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>Consistency Settings</h3>
        <p className={styles.subtitle}>Lock attributes when regenerating objects across shots</p>
      </header>
      <div className={styles.grid}>
        {CONSISTENCY_OPTIONS.map((option) => {
          const active = consistency[option.key]
          return (
            <button
              key={option.key}
              type="button"
              className={`${styles.tile} ${active ? styles.tileActive : ''}`}
              onClick={() => toggle(option.key)}
              aria-pressed={active}
            >
              <span className={styles.tileIcon} aria-hidden="true">
                {option.icon}
              </span>
              <span className={styles.tileLabel}>{option.label}</span>
              <span className={styles.tileDetail}>{option.detail}</span>
              <span className={styles.tileState}>{active ? 'Locked' : 'Unlocked'}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
