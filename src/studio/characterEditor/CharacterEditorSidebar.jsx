import { EDITOR_SECTIONS } from './characterEditorData'
import styles from './CharacterEditorSidebar.module.css'

export default function CharacterEditorSidebar({ activeSection, onSectionChange }) {
  return (
    <nav className={styles.sidebar} aria-label="Character editor sections">
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
