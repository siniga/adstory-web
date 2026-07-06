import { EXPECTED_CHANGES } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function AIPreviewCard() {
  return (
    <section className={styles.previewCard}>
      <h4 className={styles.previewTitle}>AI Preview</h4>
      <p className={styles.previewSubtitle}>The system expects to modify:</p>
      <ul className={styles.previewList}>
        {EXPECTED_CHANGES.map((item) => (
          <li key={item.key}>
            <span className={styles.previewCheck} aria-hidden="true">
              ✓
            </span>
            {item.label}
          </li>
        ))}
      </ul>
      <div className={styles.previewPlaceholder} aria-hidden="true">
        <span>Preview placeholder</span>
      </div>
    </section>
  )
}
