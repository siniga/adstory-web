import { getShotDisplayImageUrl } from '../../../utils/resolveMediaUrl'
import { getShotItemStatusLabel } from '../../sceneboardStatus'
import styles from './Sceneboard.module.css'

function shotBadgeClass(label) {
  if (label === 'Generating') return styles.badgeGenerating
  if (label === 'Ready') return styles.badgeReady
  if (label === 'Failed') return styles.badgeFailed
  return styles.badgeQueued
}

export default function SceneboardShotCard({ shot, index, onSelect }) {
  const imageUrl = getShotDisplayImageUrl(shot)
  const statusLabel = getShotItemStatusLabel(shot)
  const shotType = shot.shotSize?.trim() || shot.title?.trim() || 'Shot'
  const cameraAngle = shot.cameraAngle?.trim() || shot.camera?.trim() || '—'

  return (
    <article
      className={styles.shotCard}
      style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}
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
      <div className={styles.shotThumb}>
        {imageUrl ? (
          <img src={imageUrl} alt="" className={styles.shotThumbImage} />
        ) : (
          <span className={styles.shotThumbPlaceholder} aria-hidden="true">
            □
          </span>
        )}
      </div>
      <div className={styles.shotBody}>
        <p className={styles.shotNumber}>Shot {shot.shot_number ?? index + 1}</p>
        <p className={styles.shotType}>{shotType}</p>
        <p className={styles.shotAngle}>{cameraAngle}</p>
        <span className={`${styles.statusBadge} ${shotBadgeClass(statusLabel)}`}>
          {statusLabel}
        </span>
      </div>
    </article>
  )
}
