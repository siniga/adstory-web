import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconSearch } from '../icons'
import { filterCharacters, findCharacterById, getCharacters } from './characterData'
import CharacterCard from './CharacterCard'
import CharacterDetailsPanel from './CharacterDetailsPanel'
import styles from './CharacterLibraryModal.module.css'

export default function CharacterLibraryModal({ open, onClose, onOpenCharacterEditor }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(() => filterCharacters(getCharacters(), search), [search, open])
  const selected = selectedId ? findCharacterById(selectedId) : null

  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedId(null)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (selectedId) {
          setSelectedId(null)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, selectedId])

  if (!open) return null

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <aside
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Character Library"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h2 className={styles.title}>Characters</h2>
            <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
              <IconClose />
            </button>
          </div>

          {!selected && (
            <div className={styles.toolbar}>
              <label className={styles.searchWrap}>
                <IconSearch />
                <input
                  className={styles.searchInput}
                  type="search"
                  placeholder="Search characters..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button type="button" className={styles.newBtn}>
                <IconPlus />
                <span>New Character</span>
              </button>
            </div>
          )}
        </header>

        {selected ? (
          <CharacterDetailsPanel
            character={selected}
            onBack={() => setSelectedId(null)}
            onOpenCharacterEditor={onOpenCharacterEditor}
          />
        ) : (
          <div className={styles.gridWrap}>
            {filtered.length > 0 ? (
              <div className={styles.grid}>
                {filtered.map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    onSelect={setSelectedId}
                    onOpenCharacterEditor={onOpenCharacterEditor}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No characters match your search.</p>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}
