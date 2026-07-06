import { EDITOR_SECTIONS } from './objectEditorData'
import styles from './ObjectEditorSidebar.module.css'

export default function ObjectEditorSidebar({ activeSection, onSectionChange }) {
  return (
    <nav className={styles.sidebar} aria-label="Object editor sections">
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
