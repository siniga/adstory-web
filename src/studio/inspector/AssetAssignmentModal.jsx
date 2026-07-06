import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import { getCharacters } from '../characters/characterData'
import { getEnvironments } from '../environments/environmentData'
import { getObjects } from '../objects/objectData'
import { IconClose } from '../icons'
import styles from './AssetAssignmentModal.module.css'

const DEFAULT_CHARACTER_GRADIENT = 'linear-gradient(145deg, #111827 0%, #374151 100%)'

function getModalConfig(type) {
  if (type === 'character') {
    return {
      title: 'Select Character',
      subtitle: 'Choose a character to add to this shot',
      items: getCharacters(),
      getLabel: (item) => item.name,
      getMeta: (item) => item.role ?? '',
      getThumb: (item) =>
        buildMediaThumbStyle(
          item.heroImageUrl ?? item.referenceImageUrl ?? item.image_url,
          item.imageGradient ?? DEFAULT_CHARACTER_GRADIENT
        ),
    }
  }

  if (type === 'environment') {
    return {
      title: 'Select Environment',
      subtitle: 'Choose an environment for this shot',
      items: getEnvironments(),
      getLabel: (item) => item.name,
      getMeta: (item) => item.type ?? item.location ?? '',
      getThumb: (item) =>
        buildMediaThumbStyle(
          item.previewImage ?? item.image_url ?? item.heroImageUrl,
          item.thumbnailGradient ?? item.thumbGradient
        ),
    }
  }

  if (type === 'object') {
    return {
      title: 'Select Object',
      subtitle: 'Choose an object to add to this shot',
      items: getObjects(),
      getLabel: (item) => item.name,
      getMeta: (item) => item.categoryLabel ?? item.category ?? '',
      getThumb: (item) =>
        buildMediaThumbStyle(
          item.previewImage ?? item.image_url,
          item.thumbnailGradient ?? item.thumbGradient
        ),
    }
  }

  return null
}

export default function AssetAssignmentModal({ open, type, onClose, onSelect, excludeIds = [] }) {
  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !type) return null

  const config = getModalConfig(type)
  if (!config) return null

  const available = config.items.filter((item) => !excludeIds.includes(item.id))

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={config.title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>{config.title}</h2>
            <p className={styles.subtitle}>{config.subtitle}</p>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <ul className={styles.list}>
          {available.length > 0 ? (
            available.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={styles.itemBtn}
                  onClick={() => {
                    onSelect(item.id)
                    onClose()
                  }}
                >
                  <span className={styles.thumb} style={config.getThumb(item)} aria-hidden="true" />
                  <span className={styles.itemMeta}>
                    <span className={styles.itemName}>{config.getLabel(item)}</span>
                    <span className={styles.itemDetail}>{config.getMeta(item)}</span>
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className={styles.empty}>No assets available to assign.</li>
          )}
        </ul>
      </div>
    </div>,
    document.body
  )
}
