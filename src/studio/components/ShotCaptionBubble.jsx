import { getShotCaption } from '../shotCaption'
import styles from './ShotCaptionBubble.module.css'

export default function ShotCaptionBubble({ shot, variant = 'timeline' }) {
  const { title, subtitle } = getShotCaption(shot)

  if (!title && !subtitle) {
    return null
  }

  return (
    <div className={`${styles.bubble} ${styles[variant]}`} aria-hidden="true">
      <span className={styles.title}>{title}</span>
      {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
    </div>
  )
}
