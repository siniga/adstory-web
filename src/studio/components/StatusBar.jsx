import { IconBell, IconChat, IconSettings } from '../icons'
import styles from './StatusBar.module.css'

export default function StatusBar() {
  return (
    <footer className={styles.bar}>
      <div className={styles.info}>
        <span>Duration - 01:45 min</span>
        <span className={styles.sep}>·</span>
        <span>Frames 270</span>
        <span className={styles.sep}>·</span>
        <span>Resolution 16:9 (1920×1080)</span>
      </div>
      <div className={styles.actions}>
        <button type="button" className={styles.iconBtn} aria-label="Settings">
          <IconSettings />
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Notifications">
          <IconBell />
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Feedback">
          <IconChat />
        </button>
      </div>
    </footer>
  )
}
