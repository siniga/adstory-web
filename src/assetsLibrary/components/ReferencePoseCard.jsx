import { getReferenceStatusLabel } from '../characterReferences'
import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import styles from './ReferencePoseCard.module.css'

const STATUS_CLASS = {
  pending: styles.statusPending,
  generating: styles.statusGenerating,
  completed: styles.statusCompleted,
  failed: styles.statusFailed,
}

export default function ReferencePoseCard({
  label,
  gradient,
  imageUrl,
  imageSrc,
  status = 'pending',
  isPose = true,
  showStatusBadge,
  selected = false,
  isGenerating = false,
  onSelect,
  onGenerate,
  onPreviewImage,
}) {
  const resolvedSrc = imageSrc ?? imageUrl ?? null
  const hasImage = Boolean(resolvedSrc)
  const effectiveStatus = isGenerating ? 'generating' : status
  const imageStyle = buildMediaThumbStyle(hasImage && !imageSrc ? resolvedSrc : null, gradient)
  const canGenerate = isPose && !isGenerating && typeof onGenerate === 'function'
  const canPreview = hasImage && typeof onPreviewImage === 'function'
  const actionLabel = hasImage || effectiveStatus === 'completed' ? 'Regenerate' : 'Generate'
  const displayStatusBadge = showStatusBadge ?? isPose

  const handleImageClick = () => {
    if (canPreview) {
      onPreviewImage()
      return
    }
    onSelect?.()
  }

  return (
    <div className={`${styles.card} ${selected ? styles.selected : ''}`}>
      <div className={styles.imageWrap}>
        <button
          type="button"
          className={`${styles.imageBtn} ${canPreview ? styles.imageBtnPreviewable : ''}`}
          onClick={handleImageClick}
          aria-pressed={selected}
          aria-label={canPreview ? `View ${label}` : label}
        >
          <span className={styles.image} style={imageStyle} aria-hidden={Boolean(imageSrc)}>
            {imageSrc ? (
              <img
                src={imageSrc}
                alt=""
                className={styles.refImage}
                onError={() => console.error('Reference image failed to load', imageSrc)}
              />
            ) : null}
            {selected && effectiveStatus === 'completed' && !isGenerating ? (
              <span className={styles.check}>✓</span>
            ) : null}
            {displayStatusBadge ? (
              <span
                className={`${styles.statusBadge} ${STATUS_CLASS[effectiveStatus] ?? styles.statusPending}`}
              >
                {getReferenceStatusLabel(effectiveStatus)}
              </span>
            ) : null}
          </span>
        </button>
        {canGenerate ? (
          <div className={styles.hoverActions}>
            <button
              type="button"
              className={styles.hoverBtn}
              onClick={(event) => {
                event.stopPropagation()
                onGenerate()
              }}
            >
              {actionLabel}
            </button>
          </div>
        ) : null}
        {isGenerating ? (
          <div className={styles.generatingOverlay} aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <span className={styles.generatingText}>Generating...</span>
          </div>
        ) : null}
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  )
}
