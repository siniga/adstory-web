import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose, IconPlus, IconSearch } from '../icons'
import { filterEnvironments, findEnvironmentById, getEnvironments } from './environmentData'
import EnvironmentCard from './EnvironmentCard'
import EnvironmentDetailsPanel from './EnvironmentDetailsPanel'
import styles from './EnvironmentLibraryModal.module.css'

export default function EnvironmentLibraryModal({ open, onClose, onOpenEnvironmentEditor }) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(() => filterEnvironments(getEnvironments(), search), [search, open])
  const selected = selectedId ? findEnvironmentById(selectedId) : null

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
        aria-label="Environment Library"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.headerTop}>
            <h2 className={styles.title}>Environments</h2>
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
                  placeholder="Search environments..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <button type="button" className={styles.newBtn}>
                <IconPlus />
                <span>New Environment</span>
              </button>
            </div>
          )}
        </header>

        {selected ? (
          <EnvironmentDetailsPanel
            environment={selected}
            onBack={() => setSelectedId(null)}
            onOpenEnvironmentEditor={onOpenEnvironmentEditor}
          />
        ) : (
          <div className={styles.gridWrap}>
            {filtered.length > 0 ? (
              <div className={styles.grid}>
                {filtered.map((environment) => (
                  <EnvironmentCard
                    key={environment.id}
                    environment={environment}
                    onSelect={setSelectedId}
                    onOpenEnvironmentEditor={onOpenEnvironmentEditor}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No environments match your search.</p>
            )}
          </div>
        )}
      </aside>
    </div>,
    document.body
  )
}
