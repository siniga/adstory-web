import { IconCopy, IconEdit, IconTrash } from '../icons'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import styles from './CharacterCard.module.css'

const DEFAULT_GRADIENT = 'linear-gradient(145deg, #111827 0%, #374151 100%)'

export default function CharacterCard({ character, onSelect, onOpenCharacterEditor }) {
  const initial = (character.name?.charAt(0) ?? '?').toUpperCase()
  const thumbStyle = buildMediaThumbStyle(
    character.heroImageUrl ?? character.referenceImageUrl ?? character.image_url,
    character.imageGradient ?? DEFAULT_GRADIENT
  )

  const openEditor = (event) => {
    event.stopPropagation()
    onOpenCharacterEditor?.(character.id)
  }

  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.cardBody}
        onClick={() => {
          if (onOpenCharacterEditor) {
            onOpenCharacterEditor(character.id)
          } else {
            onSelect(character.id)
          }
        }}
        aria-label={`Open ${character.name} editor`}
      >
        <div
          className={styles.image}
          style={thumbStyle}
          aria-hidden="true"
        >
          <span className={styles.initial}>{initial}</span>
        </div>
        <div className={styles.meta}>
          <span className={styles.name}>{character.name}</span>
          <span className={styles.role}>{character.role}</span>
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
