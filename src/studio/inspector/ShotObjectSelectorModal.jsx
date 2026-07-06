import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import { IconClose } from '../icons'
import styles from './AssetAssignmentModal.module.css'

function ObjectOption({ object, selected, onToggle }) {
  return (
    <li>
      <button
        type="button"
        className={`${styles.itemBtn} ${selected ? styles.itemBtnSelected : ''}`}
        onClick={() => onToggle(object.id)}
        aria-pressed={selected}
      >
        <span
          className={styles.thumb}
          style={buildMediaThumbStyle(object.previewImage, object.thumbnailGradient, {
            background: object.thumbnailGradient,
          })}
          aria-hidden="true"
        />
        <span className={styles.itemMeta}>
          <span className={styles.itemName}>{object.name}</span>
          <span className={styles.itemDetail}>{object.categoryLabel || object.category || 'Object'}</span>
        </span>
        <span className={styles.selectMark} aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      </button>
    </li>
  )
}

export default function ShotObjectSelectorModal({
  open,
  projectObjects = [],
  initialSelectedIds = [],
  onClose,
  onSave,
  saving = false,
  error = null,
}) {
  const [selectedIds, setSelectedIds] = useState(initialSelectedIds)

  useEffect(() => {
    if (open) {
      setSelectedIds(initialSelectedIds)
    }
  }, [open, initialSelectedIds])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, saving])

  if (!open) return null

  const toggleObject = (objectId) => {
    setSelectedIds((prev) => {
      const id = Number(objectId)
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Manage shot objects"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Manage Objects</h2>
            <p className={styles.subtitle}>Select objects for this shot</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <IconClose />
          </button>
        </header>

        <ul className={styles.list}>
          {projectObjects.length > 0 ? (
            projectObjects.map((object) => (
              <ObjectOption
                key={object.id}
                object={object}
                selected={selectedIds.includes(Number(object.id))}
                onToggle={toggleObject}
              />
            ))
          ) : (
            <li className={styles.empty}>No objects in this project yet.</li>
          )}
        </ul>

        {error ? <p className={styles.error}>{error}</p> : null}

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={() => onSave(selectedIds)} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
