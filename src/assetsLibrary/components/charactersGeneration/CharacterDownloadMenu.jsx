import { useEffect, useRef, useState } from 'react'
import styles from './CharacterDownloadMenu.module.css'

const DISABLED_TOOLTIP = 'No generated image yet.'

export default function CharacterDownloadMenu({
  row,
  isDownloading = false,
  onDownloadHero,
  onDownloadReferences,
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [open])

  return (
    <div className={styles.menu} ref={menuRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        disabled={isDownloading}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Download options for ${row.name}`}
      >
        {isDownloading ? '…' : '↓'}
      </button>

      {open ? (
        <div className={styles.dropdown} role="menu">
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={!row.canDownloadHero || isDownloading}
            title={!row.canDownloadHero ? DISABLED_TOOLTIP : undefined}
            onClick={() => {
              onDownloadHero?.(row)
              setOpen(false)
            }}
          >
            Download Hero Image
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.item}
            disabled={!row.canDownloadReferences || isDownloading}
            title={!row.canDownloadReferences ? DISABLED_TOOLTIP : undefined}
            onClick={() => {
              onDownloadReferences?.(row)
              setOpen(false)
            }}
          >
            Download References ZIP
          </button>
        </div>
      ) : null}
    </div>
  )
}
