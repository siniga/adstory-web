import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { resolveMediaUrl } from '../../utils/resolveMediaUrl'
import { IconClose } from '../icons'
import styles from './AssetAssignmentModal.module.css'

function CharacterOption({ character, selected, onToggle }) {
  const heroUrl = resolveMediaUrl(character.heroImageUrl)

  return (
    <li>
      <button
        type="button"
        className={`${styles.itemBtn} ${selected ? styles.itemBtnSelected : ''}`}
        onClick={() => onToggle(character.id)}
        aria-pressed={selected}
      >
        <span
          className={styles.thumb}
          style={
            heroUrl
              ? { backgroundImage: `url(${heroUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: 'linear-gradient(135deg, #1a1a2e, #4a3060)' }
          }
          aria-hidden="true"
        />
        <span className={styles.itemMeta}>
          <span className={styles.itemName}>{character.name}</span>
          <span className={styles.itemDetail}>{character.role || 'Character'}</span>
        </span>
        <span className={styles.selectMark} aria-hidden="true">
          {selected ? '✓' : ''}
        </span>
      </button>
    </li>
  )
}

export default function ShotCharacterSelectorModal({
  open,
  projectCharacters = [],
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

  const toggleCharacter = (characterId) => {
    setSelectedIds((prev) => {
      const id = Number(characterId)
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id)
      }
      return [...prev, id]
    })
  }

  const handleSave = () => {
    onSave(selectedIds)
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Assign characters to shot"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Manage Characters</h2>
            <p className={styles.subtitle}>Select characters for this shot</p>
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
          {projectCharacters.length > 0 ? (
            projectCharacters.map((character) => (
              <CharacterOption
                key={character.id}
                character={character}
                selected={selectedIds.includes(Number(character.id))}
                onToggle={toggleCharacter}
              />
            ))
          ) : (
            <li className={styles.empty}>No characters in this project yet.</li>
          )}
        </ul>

        {error ? <p className={styles.error}>{error}</p> : null}

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
