import { IconCopy, IconEdit, IconTrash } from '../icons'
import styles from './ObjectCard.module.css'

export default function ObjectCard({ object, onSelect, onOpenObjectEditor }) {
  const openEditor = (event) => {
    event.stopPropagation()
    onOpenObjectEditor?.(object.id)
  }

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.cardBody}
        onClick={() => {
          if (onOpenObjectEditor) {
            onOpenObjectEditor(object.id)
          } else {
            onSelect(object.id)
          }
        }}
        aria-label={`Open ${object.name} editor`}
      >
        <div
          className={styles.image}
          style={{ background: object.thumbnailGradient }}
          aria-hidden="true"
        />
        <div className={styles.meta}>
          <span className={styles.name}>{object.name}</span>
          <span className={styles.category}>{object.categoryLabel}</span>
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
