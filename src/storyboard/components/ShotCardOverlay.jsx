import { IconFullscreen, IconSparkle } from '../../studio/icons'
import styles from '../ProjectStoryboard.module.css'

export default function ShotCardOverlay({
  hasImage = false,
  regenerating = false,
  canRegenerate = true,
  readOnly = false,
  onFullscreen,
  onRegenerate,
}) {
  return (
    <div className={styles.shotOverlay} onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        className={styles.shotOverlayBtn}
        onClick={onFullscreen}
        disabled={!hasImage}
        aria-label="View fullscreen"
        title={hasImage ? 'View fullscreen' : 'Generate an image first'}
      >
        <IconFullscreen />
      </button>
      {readOnly ? null : (
        <button
          type="button"
          className={styles.shotOverlayBtn}
          onClick={onRegenerate}
          disabled={!canRegenerate || regenerating}
          aria-label={regenerating ? 'Regenerating' : 'Regenerate shot'}
          title={regenerating ? 'Regenerating…' : 'Regenerate'}
        >
          <IconSparkle />
        </button>
      )}
    </div>
  )
}
