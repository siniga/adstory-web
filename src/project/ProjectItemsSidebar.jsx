import { BookOpen, FileText, Film, LayoutDashboard, MapPinned, ScrollText, Users } from 'lucide-react'
import { PROJECT_OVERVIEW_ID } from './projectItems'
import styles from './ProjectItemsSidebar.module.css'

const ICONS = {
  story: BookOpen,
  screenplay: ScrollText,
  sceneboard: Film,
  characters: Users,
  environments: MapPinned,
}

export default function ProjectItemsSidebar({ items, activeId, onSelect }) {
  const overviewActive = !activeId || activeId === PROJECT_OVERVIEW_ID

  return (
    <aside className={styles.sidebar} aria-label="Project items">
      <p className={styles.eyebrow}>Project items</p>
      <nav className={styles.nav}>
        <button
          type="button"
          className={`${styles.item} ${overviewActive ? styles.itemActive : ''}`}
          aria-current={overviewActive ? 'page' : undefined}
          onClick={() => onSelect(PROJECT_OVERVIEW_ID)}
        >
          <LayoutDashboard className={styles.icon} strokeWidth={1.75} />
          <span>Overview</span>
        </button>
        <div className={styles.navDivider} aria-hidden="true" />
        {items.length === 0 ? (
          <p className={styles.empty}>No materials in this project yet.</p>
        ) : (
          items.map((item) => {
            const Icon = ICONS[item.id] ?? FileText
            const active = item.id === activeId
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.item} ${active ? styles.itemActive : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(item.id)}
              >
                <Icon className={styles.icon} strokeWidth={1.75} />
                <span>{item.label}</span>
              </button>
            )
          })
        )}
      </nav>
    </aside>
  )
}
