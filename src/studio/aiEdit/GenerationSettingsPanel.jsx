import { useState } from 'react'
import { CONSISTENCY_OPTIONS, CREATIVITY_OPTIONS } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function GenerationSettingsPanel({
  creativity,
  consistency,
  onCreativityChange,
  onConsistencyChange,
}) {
  const [open, setOpen] = useState(false)

  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.collapseToggle}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span>Generation Settings</span>
        <span className={styles.collapseIcon} aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      {open && (
        <div className={styles.settingsBody}>
          <div className={styles.settingGroup}>
            <span className={styles.settingLabel}>Creativity</span>
            <div className={styles.settingChips}>
              {CREATIVITY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.settingChip} ${creativity === option ? styles.settingChipActive : ''}`}
                  onClick={() => onCreativityChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.settingGroup}>
            <span className={styles.settingLabel}>Consistency</span>
            <div className={styles.settingChips}>
              {CONSISTENCY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${styles.settingChip} ${consistency === option ? styles.settingChipActive : ''}`}
                  onClick={() => onConsistencyChange(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
