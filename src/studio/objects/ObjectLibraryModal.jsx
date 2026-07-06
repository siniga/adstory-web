import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconSearch } from '../icons'
import {
  OBJECT_CATEGORIES,
  filterObjects,
  findObjectById,
  getObjects,
} from './objectData'
import ObjectCard from './ObjectCard'
import ObjectCategoryTabs from './ObjectCategoryTabs'
import ObjectDetailsPanel from './ObjectDetailsPanel'
import styles from './ObjectLibraryModal.module.css'

export default function ObjectLibraryModal({ open, onClose, onOpenObjectEditor }) {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(
    () => filterObjects(getObjects(), search, categoryId),
    [search, categoryId, open]
  )
  const selected = selectedId ? findObjectById(selectedId) : null

  useEffect(() => {
    if (!open) {
      setSearch('')
      setCategoryId('all')
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
        aria-label="Object Library"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h2 className={styles.title}>Objects &amp; Props</h2>
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
                  placeholder="Search objects..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button type="button" className={styles.newBtn}>
                <IconPlus />
                <span>New Object</span>
              </button>
            </div>
          )}
        </header>

        {!selected && (
          <ObjectCategoryTabs
            categories={OBJECT_CATEGORIES}
            activeId={categoryId}
            onChange={setCategoryId}
          />
        )}

        {selected ? (
          <ObjectDetailsPanel
            object={selected}
            onBack={() => setSelectedId(null)}
            onOpenObjectEditor={onOpenObjectEditor}
          />
        ) : (
          <div className={styles.gridWrap}>
            {filtered.length > 0 ? (
              <div className={styles.grid}>
                {filtered.map((object) => (
                  <ObjectCard
                    key={object.id}
                    object={object}
                    onSelect={setSelectedId}
                    onOpenObjectEditor={onOpenObjectEditor}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No objects match your search.</p>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}
