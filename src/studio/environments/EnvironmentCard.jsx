import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import { IconCopy, IconEdit, IconTrash } from '../icons'
import styles from './EnvironmentCard.module.css'

export default function EnvironmentCard({ environment, onSelect, onOpenEnvironmentEditor }) {
  const thumbStyle = buildMediaThumbStyle(
    environment.previewImage,
    environment.thumbnailGradient
  )

  const openEditor = (event) => {
    event.stopPropagation()
    onOpenEnvironmentEditor?.(environment.id)
  }

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.cardBody}
        onClick={() => {
          if (onOpenEnvironmentEditor) {
            onOpenEnvironmentEditor(environment.id)
          } else {
            onSelect(environment.id)
          }
        }}
        aria-label={`Open ${environment.name} editor`}
      >
        <div className={styles.image} style={thumbStyle} aria-hidden="true" />
        <div className={styles.meta}>
          <span className={styles.name}>{environment.name}</span>
          <span className={styles.type}>{environment.type}</span>
          <span className={styles.mood}>{environment.mood}</span>
        </div>
      </button>

      <div className={styles.actions}>
        <button type="button" className={styles.actionBtn} onClick={openEditor}>
          <IconEdit />
          <span>Edit</span>
        </button>
        <button type="button" className={styles.actionBtn} tabIndex={-1}>
          <IconCopy />
          <span>Duplicate</span>
        </button>
        <button type="button" className={`${styles.actionBtn} ${styles.actionDanger}`} tabIndex={-1}>
          <IconTrash />
          <span>Delete</span>
        </button>
      </div>
    </article>
  )
}
