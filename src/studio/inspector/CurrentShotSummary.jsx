import { formatRelativeTime } from './formatRelativeTime'
import styles from './CurrentShotSummary.module.css'

export default function CurrentShotSummary({
  sceneId,
  sceneTitle,
  shotId,
  shotTitle,
  characterCount,
  environmentCount,
  objectCount,
  lastUpdatedAt,
}) {
  return (
    <section className={styles.summary} aria-label="Current shot summary">
      <div className={styles.heading}>
        <span className={styles.location}>
          Scene {sceneId ?? '—'} · Shot {shotId}
        </span>
        <span className={styles.stats} title="Characters · Environment · Objects">
          {characterCount} · {environmentCount} · {objectCount}
        </span>
      </div>

      {sceneTitle || shotTitle ? (
        <p className={styles.names}>
          {sceneTitle ? <span className={styles.sceneName}>{sceneTitle}</span> : null}
          {shotTitle ? <span className={styles.shotName}>{shotTitle}</span> : null}
        </p>
      ) : null}

      <div className={styles.updated}>
        <span className={styles.updatedLabel}>Updated</span>
        <span className={styles.updatedValue}>{formatRelativeTime(lastUpdatedAt)}</span>
      </div>
    </section>
  )
}
