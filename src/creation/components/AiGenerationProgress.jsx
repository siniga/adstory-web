import {
  deriveProgressPercent,
  estimateTimeRemaining,
  formatEstimatedSecondsRemaining,
  formatEstimatedTimeRemaining,
  isGenerationInProgress,
  isGenerationTerminal,
  PROJECT_GEN_STATUS,
} from '../aiGenerationStatus'
import styles from './SceneGenerationProgress.module.css'

const VARIANT_CONFIG = {
  scenes: {
    titleActive: 'Generating Storyboard Scenes',
    titleDone: 'Scene generation complete',
    titleDoneWithErrors: 'Scene generation finished with errors',
    titleStalled: 'Scene generation paused',
    planningHint: 'Planning scenes…',
    stuckMessage: 'Scene generation seems stuck.',
    failedMessage: (failed) =>
      `${failed} scene${failed === 1 ? '' : 's'} failed to generate.`,
    retryFailedLabel: 'Retry Failed Scenes',
    showTask: false,
    getSubtitle(progress) {
      const currentNumber =
        progress.currentScene?.scene_number ??
        Math.min((progress.completed ?? 0) + 1, progress.total || 1)
      return progress.total > 0 ? `Scene ${currentNumber} of ${progress.total}` : null
    },
  },
  shots: {
    titleActive: 'Generating Shots',
    titleDone: 'Shot generation complete',
    titleDoneWithErrors: 'Shot generation finished with errors',
    titleStalled: 'Shot generation paused',
    planningHint: 'Planning shots…',
    stuckMessage: 'Shot generation seems stuck.',
    failedMessage: (failed) =>
      `${failed} scene${failed === 1 ? '' : 's'} failed during shot generation.`,
    retryFailedLabel: 'Retry Failed Scenes',
    showTask: true,
    getSubtitle(progress) {
      const scene = progress.currentScene
      if (!scene || !progress.total) return null
      const sceneNumber =
        scene.scene_number ?? Math.min((progress.completed ?? 0) + 1, progress.total)
      return `Scene ${sceneNumber} of ${progress.total}`
    },
    getTaskLabel(progress) {
      const scene = progress.currentScene
      if (!scene) return null
      const taskStatus = scene.shot_generation_status ?? scene.status
      if (!taskStatus) return null
      return `Current task: ${String(taskStatus).replace(/_/g, ' ')}`
    },
  },
  characters: {
    titleActive(progress) {
      if (progress.phase === 'extraction') return 'Extracting characters'
      return 'Generating character portraits'
    },
    titleDone: 'Character generation complete',
    titleDoneWithErrors: 'Character generation finished with errors',
    titleStalled: 'Character generation paused',
    planningHint: 'Extracting characters…',
    stuckMessage: 'Character generation seems stuck.',
    failedMessage: (failed) =>
      `${failed} character portrait${failed === 1 ? '' : 's'} failed to generate.`,
    retryFailedLabel: 'Retry Failed Characters',
    showTask: false,
    getSubtitle(progress) {
      const currentCharacter = progress.currentCharacter
      if (currentCharacter?.name) {
        return `Current: ${currentCharacter.name}`
      }
      const total = progress.total ?? 0
      if (!total) return null
      const currentNumber = Math.min((progress.completed ?? 0) + 1, total)
      return `Character ${currentNumber} of ${total}`
    },
  },
  environments: {
    titleActive(progress) {
      if (progress.phase === 'extraction') return 'Extracting environments'
      return 'Generating environment images'
    },
    titleDone: 'Environment generation complete',
    titleDoneWithErrors: 'Environment generation finished with errors',
    titleStalled: 'Environment generation paused',
    planningHint: 'Extracting environments…',
    stuckMessage: 'Environment generation seems stuck.',
    failedMessage: (failed) =>
      `${failed} environment image${failed === 1 ? '' : 's'} failed to generate.`,
    retryFailedLabel: 'Retry Failed Environments',
    showTask: false,
    getSubtitle(progress) {
      const currentEnvironment = progress.currentEnvironment
      if (currentEnvironment?.name) {
        return `Current: ${currentEnvironment.name}`
      }
      const total = progress.total ?? 0
      if (!total) return null
      const currentNumber = Math.min((progress.completed ?? 0) + 1, total)
      return `Environment ${currentNumber} of ${total}`
    },
  },
}

export default function AiGenerationProgress({
  type = 'scenes',
  progress,
  startedAt,
  isStuck = false,
  resuming = null,
  onResume,
  onRetryFailedAndResume,
}) {
  if (!progress) return null

  const config = VARIANT_CONFIG[type] ?? VARIANT_CONFIG.scenes
  const { status, total, completed, failed } = progress
  const isActive = isGenerationInProgress(status)
  const isDone = isGenerationTerminal(status)
  const isStalled = status === PROJECT_GEN_STATUS.STALLED || Boolean(progress.stalled)
  const showStuckRecovery = isStuck || isStalled
  const showFailedRecovery = (failed ?? 0) > 0 && (showStuckRecovery || isDone)

  if (!isActive && !isDone && total === 0 && !showStuckRecovery && !showFailedRecovery) {
    return null
  }

  const remaining = progress.remaining ?? Math.max(0, total - completed - failed)
  const percent = deriveProgressPercent({
    progress_percent: progress.progress_percent,
    completed,
    failed,
    total,
    status,
  })
  const displayPercent = isDone && percent < 100 ? 100 : percent
  const subtitle = config.getSubtitle?.(progress)
  const taskLabel = config.showTask ? config.getTaskLabel?.(progress) : null
  const etaMs = estimateTimeRemaining({ completed, total, failed, startedAt })
  const etaFromBackend = formatEstimatedSecondsRemaining(progress.estimated_remaining_seconds)
  const etaLabel = etaFromBackend ?? formatEstimatedTimeRemaining(etaMs)
  const isResuming = Boolean(resuming)

  const activeTitle =
    typeof config.titleActive === 'function' ? config.titleActive(progress) : config.titleActive

  const title = isDone
    ? status === PROJECT_GEN_STATUS.COMPLETED_WITH_ERRORS
      ? config.titleDoneWithErrors
      : config.titleDone
    : isStalled
      ? config.titleStalled
      : activeTitle

  return (
    <section className={styles.panel} aria-live="polite">
      <div className={styles.header}>
        <h2 className={styles.title}>{title}</h2>
        {isActive && subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        {isActive && taskLabel ? <p className={styles.subtitle}>{taskLabel}</p> : null}
      </div>

      {total > 0 ? (
        <>
          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={styles.progressFill}
              style={{ width: `${Math.max(displayPercent, isActive ? 4 : 0)}%` }}
            />
          </div>
          <p className={styles.percentLabel}>{displayPercent}%</p>
        </>
      ) : isActive ? (
        <p className={styles.planningHint} role="status">
          {config.planningHint}
        </p>
      ) : null}

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>Completed</dt>
          <dd>{completed}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Failed</dt>
          <dd>{failed}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Remaining</dt>
          <dd>{remaining}</dd>
        </div>
        {etaLabel && isActive && !showStuckRecovery ? (
          <div className={`${styles.stat} ${styles.statWide}`}>
            <dt>Estimated time remaining</dt>
            <dd>{etaLabel}</dd>
          </div>
        ) : null}
      </dl>

      {showStuckRecovery || showFailedRecovery ? (
        <div className={styles.stuckPanel} role="status">
          {showStuckRecovery ? (
            <p className={styles.stuckMessage}>{config.stuckMessage}</p>
          ) : (
            <p className={styles.stuckMessage}>{config.failedMessage(failed ?? 0)}</p>
          )}
          <div className={styles.stuckActions}>
            {showStuckRecovery && onResume ? (
              <button
                type="button"
                className={styles.resumeBtn}
                onClick={onResume}
                disabled={isResuming}
              >
                {resuming === 'resume' ? 'Resuming…' : 'Resume Generation'}
              </button>
            ) : null}
            {(showStuckRecovery || showFailedRecovery) && onRetryFailedAndResume ? (
              <button
                type="button"
                className={styles.retryResumeBtn}
                onClick={onRetryFailedAndResume}
                disabled={isResuming}
              >
                {resuming === 'retry_failed'
                  ? 'Resuming…'
                  : showStuckRecovery
                    ? 'Retry Failed + Resume'
                    : config.retryFailedLabel}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  )
}
