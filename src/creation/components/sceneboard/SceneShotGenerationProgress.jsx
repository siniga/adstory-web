import {
  deriveProgressPercent,
  isGenerationInProgress,
} from '../../aiGenerationStatus'
import { formatSceneShotGenerationStatus } from '../../sceneboardStatus'
import styles from './Sceneboard.module.css'

export default function SceneShotGenerationProgress({ progress, scene }) {
  if (!progress && !scene) return null

  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const failed = progress?.failed ?? 0
  const remaining = progress?.remaining ?? Math.max(0, total - completed - failed)
  const statusLabel = formatSceneShotGenerationStatus(scene, progress?.status)
  const isActive =
    statusLabel === 'Queued' ||
    statusLabel === 'Generating' ||
    isGenerationInProgress(progress?.status)

  const percent = deriveProgressPercent({
    progress_percent: progress?.progress_percent,
    completed,
    failed,
    total,
    status: progress?.status,
  })

  if (!isActive && total === 0 && percent === 0) {
    return null
  }

  return (
    <div className={styles.generationProgress} aria-live="polite">
      <div className={styles.generationProgressHeader}>
        <span className={styles.generationProgressLabel}>Status</span>
        <span className={styles.generationProgressStatus}>{statusLabel}</span>
      </div>

      <div className={styles.generationProgressTrack} aria-hidden="true">
        <div
          className={`${styles.generationProgressFill} ${isActive ? styles.generationProgressFillActive : ''}`}
          style={{ width: `${Math.max(percent, isActive ? 4 : 0)}%` }}
        />
      </div>
      <p className={styles.generationProgressPercent}>{percent}%</p>

      <dl className={styles.generationProgressStats}>
        <div>
          <dt>Completed</dt>
          <dd>{completed}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{remaining}</dd>
        </div>
        {failed > 0 ? (
          <div>
            <dt>Failed</dt>
            <dd>{failed}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}
