import { EDITOR_SECTIONS } from './environmentEditorData'
import styles from './EnvironmentEditorSidebar.module.css'

export default function EnvironmentEditorSidebar({ activeSection, onSectionChange }) {
  return (
    <nav className={styles.sidebar} aria-label="Environment editor sections">
      <ul className={styles.list}>
        {EDITOR_SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={`${styles.item} ${activeSection === section.id ? styles.itemActive : ''}`}
              onClick={() => onSectionChange(section.id)}
            >
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
