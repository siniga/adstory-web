import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import { IconClose } from '../icons'
import styles from './AssetAssignmentModal.module.css'

function EnvironmentOption({ environment, selected, onSelect }) {
  return (
    <li>
      <button
        type="button"
        className={`${styles.itemBtn} ${selected ? styles.itemBtnSelected : ''}`}
        onClick={() => onSelect(environment.id)}
        aria-pressed={selected}
      >
        <span
          className={styles.thumb}
          style={buildMediaThumbStyle(environment.previewImage, environment.thumbnailGradient)}
          aria-hidden="true"
        />
        <span className={styles.itemMeta}>
          <span className={styles.itemName}>{environment.name}</span>
          <span className={styles.itemDetail}>
            {[environment.type, environment.location].filter(Boolean).join(' · ') || 'Environment'}
          </span>
        </span>
        <span className={styles.selectMark} aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      </button>
    </li>
  )
}

export default function ShotEnvironmentSelectorModal({
  open,
  projectEnvironments = [],
  initialSelectedId = null,
  onClose,
  onSave,
  saving = false,
  error = null,
}) {
  const [selectedId, setSelectedId] = useState(initialSelectedId)

  useEffect(() => {
    if (open) {
      setSelectedId(initialSelectedId)
    }
  }, [open, initialSelectedId])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, saving])

  if (!open) return null

  const handleSave = () => {
    if (selectedId == null) return
    onSave(Number(selectedId))
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Change shot environment"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Change Environment</h2>
            <p className={styles.subtitle}>Select one environment for this shot</p>
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
          {projectEnvironments.length > 0 ? (
            projectEnvironments.map((environment) => (
              <EnvironmentOption
                key={environment.id}
                environment={environment}
                selected={Number(selectedId) === Number(environment.id)}
                onSelect={setSelectedId}
              />
            ))
          ) : (
            <li className={styles.empty}>No environments in this project yet.</li>
          )}
        </ul>

        {error ? <p className={styles.error}>{error}</p> : null}

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || selectedId == null}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
