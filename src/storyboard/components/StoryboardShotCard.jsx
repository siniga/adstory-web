import { memo, useEffect, useRef, useState } from 'react'
import { getShotDisplayImageUrl } from '../../utils/resolveMediaUrl'
import {
  getStoryboardShotImageBadge,
  getStoryboardShotImageStatus,
} from '../storyboardWorkspaceStatus'
import styles from '../ProjectStoryboard.module.css'

function readShotText(shot, ...keys) {
  for (const key of keys) {
    const value = shot?.[key]
    if (value != null && String(value).trim()) {
      return String(value).trim()
    }
  }
  return ''
}

function ShotStatusBadge({ shot }) {
  const badge = getStoryboardShotImageBadge(shot)
  if (!badge) return null

  const toneClass =
    badge.tone === 'completed'
      ? styles.shotStatusBadgeCompleted
      : badge.tone === 'failed'
        ? styles.shotStatusBadgeFailed
        : badge.tone === 'generating'
          ? styles.shotStatusBadgeGenerating
          : styles.shotStatusBadgeQueued

  return (
    <span className={`${styles.shotStatusBadge} ${toneClass}`}>{badge.label}</span>
  )
}

function ShotImageArea({ shot, title, generating, onRetryImage }) {
  const [imageBroken, setImageBroken] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const imgRef = useRef(null)
  const imageUrl = getShotDisplayImageUrl(shot)
  const imageStatus = getStoryboardShotImageStatus(shot)
  const imageInFlight = imageStatus === 'queued' || imageStatus === 'generating'
  const canShowImage = Boolean(imageUrl) && !imageBroken && !imageInFlight && imageStatus !== 'failed'

  useEffect(() => {
    setImageBroken(false)
    setImageLoaded(false)
  }, [imageUrl, shot?.apiId, shot?.id])

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setImageLoaded(true)
    }
  }, [imageUrl, canShowImage])

  if (canShowImage) {
    return (
      <img
        ref={imgRef}
        src={imageUrl}
        alt={title}
        className={`${styles.shotImage} ${imageLoaded ? styles.shotImageVisible : ''}`}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageBroken(true)}
      />
    )
  }

  if (imageStatus === 'failed') {
    return (
      <div className={styles.shotImageState}>
        <span className={styles.shotImageFailed}>⚠ Generation Failed</span>
        <button
          type="button"
          className={styles.secondaryBtn}
          disabled={generating || !shot.apiId}
          onClick={(event) => {
            event.stopPropagation()
            onRetryImage?.(shot)
          }}
        >
          {generating ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    )
  }

  if (imageStatus === 'generating') {
    return (
      <div className={styles.shotImageState}>
        <span className={styles.shotImageSpinner} aria-hidden="true" />
        <span>Generating…</span>
      </div>
    )
  }

  if (imageStatus === 'queued') {
    return (
      <div className={styles.shotImageState}>
        <span className={styles.shotImageSpinner} aria-hidden="true" />
        <span>Queued</span>
      </div>
    )
  }

  return <span className={styles.shotImagePlaceholder}>No image yet</span>
}

const StoryboardShotCard = memo(function StoryboardShotCard({
  shot,
  selected = false,
  generating = false,
  isFirst = false,
  isLast = false,
  onSelect,
  onRetryImage,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  const shotNumber = readShotText(shot, 'shot_number', 'shotNumber') || '—'
  const imageLabel = `Shot ${shotNumber}`

  useEffect(() => {
    if (!menuOpen) return undefined

    const closeMenu = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeMenu)
    return () => document.removeEventListener('mousedown', closeMenu)
  }, [menuOpen])

  return (
    <article
      className={`${styles.shotCard} ${selected ? styles.shotCardSelected : ''}`}
      onClick={() => onSelect?.(shot)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(shot)
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className={styles.shotImageWrap}>
        <ShotStatusBadge shot={shot} />
        <ShotImageArea
          shot={shot}
          title={imageLabel}
          generating={generating}
          onRetryImage={onRetryImage}
        />
      </div>

      <div className={styles.shotCardBody}>
        <span className={styles.shotNumber}>{imageLabel}</span>

        <div className={styles.shotMenuWrap} ref={menuRef}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label="Shot actions"
            onClick={(event) => {
              event.stopPropagation()
              setMenuOpen((open) => !open)
            }}
          >
            ⋮
          </button>
          {menuOpen ? (
            <div className={styles.menuDropdown} role="menu">
              <button
                type="button"
                className={styles.menuItem}
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onDuplicate?.(shot)
                }}
              >
                Duplicate
              </button>
              <button
                type="button"
                className={styles.menuItem}
                disabled={isFirst}
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onMoveUp?.()
                }}
              >
                Move Up
              </button>
              <button
                type="button"
                className={styles.menuItem}
                disabled={isLast}
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onMoveDown?.()
                }}
              >
                Move Down
              </button>
              <button
                type="button"
                className={`${styles.menuItem} ${styles.menuItemDanger}`}
                onClick={(event) => {
                  event.stopPropagation()
                  setMenuOpen(false)
                  onDelete?.(shot)
                }}
              >
                Delete
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
})

export default StoryboardShotCard
