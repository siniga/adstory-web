import { useEffect, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { IconChevronLeft, IconChevronRight, IconClose } from '../../studio/icons'
import styles from './ShotFullscreenViewer.module.css'

export default function ShotFullscreenViewer({
  open,
  items = [],
  index = 0,
  onIndexChange,
  onClose,
}) {
  const thumbRefs = useRef([])
  const current = items[index] ?? null
  const following = useMemo(() => items.slice(index + 1), [items, index])
  const canPrev = index > 0
  const canNext = index < items.length - 1

  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.()
        return
      }
      if (event.key === 'ArrowLeft' && canPrev) {
        event.preventDefault()
        onIndexChange?.(index - 1)
      }
      if (event.key === 'ArrowRight' && canNext) {
        event.preventDefault()
        onIndexChange?.(index + 1)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, index, canPrev, canNext, onClose, onIndexChange])

  useEffect(() => {
    if (!open) return
    const node = thumbRefs.current[index + 1]
    node?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [open, index])

  if (!open || !current) return null

  return createPortal(
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={current.title}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>{current.sceneLabel}</p>
          <h2 className={styles.title}>{current.title}</h2>
        </div>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close fullscreen">
          <IconClose />
        </button>
      </header>

      <div className={styles.stage}>
        <button
          type="button"
          className={`${styles.navBtn} ${styles.navPrev}`}
          onClick={() => onIndexChange?.(index - 1)}
          disabled={!canPrev}
          aria-label="Previous shot"
        >
          <IconChevronLeft />
        </button>

        {current.imageUrl ? (
          <img src={current.imageUrl} alt={current.title} className={styles.image} />
        ) : (
          <div className={styles.placeholder}>No image yet</div>
        )}

        <button
          type="button"
          className={`${styles.navBtn} ${styles.navNext}`}
          onClick={() => onIndexChange?.(index + 1)}
          disabled={!canNext}
          aria-label="Next shot"
        >
          <IconChevronRight />
        </button>
      </div>

      <div className={styles.strip}>
        <p className={styles.stripLabel}>
          {following.length
            ? `Following shots (${following.length})`
            : 'No following shots'}
        </p>
        {following.length ? (
          <div className={styles.stripTrack}>
            {following.map((item, followIndex) => {
              const itemIndex = index + 1 + followIndex
              return (
                <button
                  key={item.key}
                  type="button"
                  ref={(node) => {
                    thumbRefs.current[itemIndex] = node
                  }}
                  className={styles.thumb}
                  onClick={() => onIndexChange?.(itemIndex)}
                  aria-label={`${item.sceneLabel}: ${item.title}`}
                >
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" className={styles.thumbImage} />
                  ) : (
                    <span className={styles.thumbPlaceholder}>□</span>
                  )}
                  <span className={styles.thumbCaption}>
                    {item.sceneLabel} · {item.title}
                  </span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className={styles.stripEmpty}>This is the last shot.</p>
        )}
      </div>
    </div>,
    document.body
  )
}
