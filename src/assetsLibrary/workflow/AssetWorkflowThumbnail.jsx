import { useMemo } from 'react'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import styles from './AssetWorkflowThumbnail.module.css'

function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5.5 19.5c.9-3.5 3.2-5.5 6.5-5.5s5.6 2 6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LandscapeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 17.5 9 11l3.5 3.5L16.5 9 20.5 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8" r="1.75" fill="currentColor" />
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function AssetWorkflowThumbnail({
  imageUrl = null,
  placeholderGradient,
  variant = 'character',
  alt = '',
}) {
  const hasImage = Boolean(imageUrl)
  const thumbStyle = useMemo(
    () => buildMediaThumbStyle(imageUrl, placeholderGradient),
    [imageUrl, placeholderGradient]
  )

  return (
    <span
      key={imageUrl || 'placeholder'}
      className={`${styles.thumbnail} ${hasImage ? styles.thumbnailHasImage : ''}`}
      style={thumbStyle}
      role="img"
      aria-label={alt || undefined}
    >
      {!hasImage ? (
        <span className={styles.placeholderIcon} aria-hidden="true">
          {variant === 'environment' ? <LandscapeIcon /> : <PersonIcon />}
        </span>
      ) : null}
    </span>
  )
}
