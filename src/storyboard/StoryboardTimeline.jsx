import { resolveShotImageSrc } from '../utils/resolveMediaUrl'
import {
  getStoryboardShotStatus,
  getStoryboardStatusLabel,
} from './storyboardStatus'
import styles from './StoryboardTimeline.module.css'

export default function StoryboardTimeline({
  scenes = [],
  selectedShotId,
  onSelectShot,
  pendingSelectionByShotId = {},
}) {
  return (
    <footer className={styles.timeline} aria-label="Storyboard timeline">
      <div className={styles.track}>
        {scenes.map((scene) => (
          <section key={scene.id} className={styles.sceneGroup}>
            <span className={styles.sceneLabel}>Scene {scene.id}</span>
            <div className={styles.shotRow}>
              {scene.shots.map((shot) => {
                const isSelected = selectedShotId === shot.id
                const shotKey = String(shot.apiId ?? shot.id)
                const status = getStoryboardShotStatus(shot, pendingSelectionByShotId[shotKey])
                const thumbSrc = resolveShotImageSrc(shot)

                return (
                  <button
                    key={shot.id}
                    type="button"
                    className={`${styles.card} ${isSelected ? styles.cardActive : ''}`}
                    onClick={() => onSelectShot(shot.id)}
                    aria-current={isSelected ? 'true' : undefined}
                  >
                    <span className={styles.thumb}>
                      {thumbSrc ? (
                        <img className={styles.thumbImage} src={thumbSrc} alt="" />
                      ) : (
                        <span
                          className={styles.thumbFallback}
                          style={{ background: shot.thumbGradient }}
                        />
                      )}
                    </span>
                    <span className={styles.meta}>
                      <span className={styles.shotId}>{shot.id}</span>
                      <span className={`${styles.status} ${styles[`status_${status}`]}`}>
                        {getStoryboardStatusLabel(status)}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </footer>
  )
}
