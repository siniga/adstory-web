import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../../studio/icons'
import styles from './ImagePreviewModal.module.css'

export default function ImagePreviewModal({ open, imageUrl, title, alt, onClose }) {
  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !imageUrl) return null

  const imageAlt = alt ?? (title ? `${title} preview` : 'Image preview')

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title ? `Preview: ${title}` : 'Image preview'}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          {title ? <h2 className={styles.title}>{title}</h2> : <span />}
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close image preview"
          >
            <IconClose />
          </button>
        </header>

        <div className={styles.body}>
          <img src={imageUrl} alt={imageAlt} className={styles.image} />
        </div>
      </div>
    </div>,
    document.body
  )
}
