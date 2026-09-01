import {
  deriveProgressPercent,
  isSceneGenerationInProgress,
} from '../../sceneGenerationStatus'
import styles from './Sceneboard.module.css'

function buildSubtitle(progress, scenes = [], starting = false) {
  const total = progress?.total ?? 0
  const completed = progress?.completed ?? 0
  const currentNumber =
    progress?.currentScene?.scene_number ??
    Math.min(completed + 1, total || Math.max(scenes.length, 1))

  if (starting && total <= 0) {
    return 'Asking AI to break the screenplay into sequences…'
  }

  if (total > 0) {
    return `Sequence ${currentNumber} of ${total}`
  }

  if (scenes.length > 0) {
    return `${scenes.length} sequence${scenes.length === 1 ? '' : 's'} created so far`
  }

  return 'Planning sequences from your screenplay…'
}

export default function SceneboardSceneGenerationProgress({
  progress,
  scenes = [],
  starting = false,
  compact = false,
  cancelling = false,
  canCancel = false,
  canResume = false,
  resuming = false,
  isStuck = false,
  onCancel,
  onResume,
}) {
  const isActive =
    starting ||
    isSceneGenerationInProgress(progress?.status) ||
    (progress?.remaining ?? 0) > 0 ||
    (progress?.queued ?? 0) > 0 ||
    (progress?.running ?? 0) > 0

  if (!isActive && !isStuck && !canResume) return null

  const total = Math.max(progress?.total ?? 0, scenes.length)
  const completed = Math.max(
    progress?.completed ?? 0,
    scenes.filter((s) => s?.status === 'completed').length
  )
  const failed = progress?.failed ?? 0
  const remaining = progress?.remaining ?? Math.max(0, total - completed - failed)

  const percent = deriveProgressPercent({
    progress_percent: progress?.progress_percent,
    completed,
    failed,
    total,
    status: progress?.status,
    scenes,
  })

  const planning = isActive && total <= 0
  const displayPercent = planning ? null : percent
  const subtitle = buildSubtitle(progress, scenes, starting)
  const fillWidth = planning
    ? undefined
    : `${Math.max(percent, isActive ? 6 : 0)}%`

  const content = (
    <>
      <div className={compact ? styles.generationProgressHeader : styles.sceneGenerationHeader}>
        <h3 className={compact ? styles.generationProgressTitle : styles.sceneGenerationTitle}>
          {starting
            ? 'Starting sequence generation…'
            : planning
              ? 'Planning sequences…'
              : 'Generating sequences from screenplay…'}
        </h3>
        {subtitle ? (
          <p className={compact ? styles.generationProgressSubtitle : styles.sceneGenerationHint}>
            {subtitle}
          </p>
        ) : null}
      </div>

      <div
        className={`${styles.generationProgressTrack} ${planning ? styles.generationProgressTrackIndeterminate : ''}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={displayPercent ?? undefined}
        aria-label="Sequence generation progress"
      >
        <div
          className={`${styles.generationProgressFill} ${
            isActive ? styles.generationProgressFillActive : ''
          } ${planning ? styles.generationProgressFillIndeterminate : ''}`}
          style={planning ? undefined : { width: fillWidth }}
        />
      </div>
      <p className={styles.generationProgressPercent}>
        {planning ? 'Planning…' : `${percent}%`}
      </p>

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
        {total > 0 ? (
          <div>
            <dt>Total</dt>
            <dd>{total}</dd>
          </div>
        ) : null}
      </dl>

      {isStuck ? (
        <p className={styles.sceneGenerationStuck} role="status">
          Sequence generation seems stuck. Resume to continue, or make sure the queue worker is
          running: <code>php artisan queue:work --queue=adstory-ai</code>
        </p>
      ) : null}

      {(canCancel && onCancel && isActive) || ((canResume || isStuck) && onResume) ? (
        <div className={styles.generationActions}>
          {canCancel && onCancel && isActive ? (
            <button
              type="button"
              className={styles.generationActionBtn}
              onClick={onCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling…' : 'Cancel generation'}
            </button>
          ) : null}
          {(canResume || isStuck) && onResume && !isActive ? (
            <button
              type="button"
              className={styles.generationActionBtn}
              onClick={onResume}
              disabled={resuming}
            >
              {resuming ? 'Resuming…' : 'Resume generation'}
            </button>
          ) : null}
          {isStuck && isActive && onResume ? (
            <button
              type="button"
              className={styles.generationActionBtn}
              onClick={onResume}
              disabled={resuming}
            >
              {resuming ? 'Retrying…' : 'Retry generation'}
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  )

  if (compact) {
    return (
      <div className={styles.progressWrap} aria-live="polite">
        <div className={styles.generationProgress}>{content}</div>
      </div>
    )
  }

  return (
    <div className={styles.sceneGenerationPanel} aria-live="polite">
      {content}
    </div>
  )
}
