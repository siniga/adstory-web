import { RECENT_PROMPTS } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function RecentPromptsPanel({ onSelect }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Recent Prompts</h4>
      <ul className={styles.recentList}>
        {RECENT_PROMPTS.map((prompt) => (
          <li key={prompt}>
            <button type="button" className={styles.recentItem} onClick={() => onSelect(prompt)}>
              {prompt}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
