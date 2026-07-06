import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectEpisodeStoryboardPath } from '../../../routes/paths'
import useEpisodeSceneGeneration from '../../hooks/useEpisodeSceneGeneration'
import {
  episodeSceneRangeLabel,
  getEpisodeSceneStatusLabel,
  isEpisodeSceneGenerationActive,
  isEpisodeSceneGenerationComplete,
  isEpisodeSceneGenerationFailed,
  mapAdstoryEpisode,
} from '../../episodeGenerationStatus'
import EpisodeProgress from './EpisodeProgress'
import styles from './Episodes.module.css'

function statusBadgeClass(statusLabel) {
  switch (statusLabel) {
    case 'Ready':
    case 'Completed':
      return styles.badgeCompleted
    case 'Generating':
      return styles.badgeGenerating
    case 'Failed':
      return styles.badgeFailed
    default:
      return styles.badgeIdle
  }
}

export default function EpisodeCard({
  episode,
  projectId,
  visualStyle,
  enabled = true,
  onEpisodeChange,
  onError,
}) {
  const navigate = useNavigate()
  const mappedEpisode = mapAdstoryEpisode(episode)

  const handleEpisodeUpdate = useCallback(
    (nextEpisode) => {
      onEpisodeChange?.(nextEpisode)
    },
    [onEpisodeChange]
  )

  const {
    progress,
    monitoring,
    starting,
    startGeneration,
  } = useEpisodeSceneGeneration({
    projectId,
    episodeId: mappedEpisode.id,
    episode: mappedEpisode,
    visualStyle,
    enabled: enabled && Boolean(mappedEpisode.id),
    onEpisodeChange: handleEpisodeUpdate,
    onError,
  })

  const isGenerating = isEpisodeSceneGenerationActive(mappedEpisode) || monitoring || starting
  const isComplete = isEpisodeSceneGenerationComplete(mappedEpisode)
  const isFailed = isEpisodeSceneGenerationFailed(mappedEpisode)
  const sceneStatus = isComplete ? 'Ready' : getEpisodeSceneStatusLabel(mappedEpisode)
  const sceneRange = episodeSceneRangeLabel(mappedEpisode)
  const estimatedScenes =
    mappedEpisode.estimatedSceneCount ||
    (mappedEpisode.endSceneNumber != null && mappedEpisode.startSceneNumber != null
      ? mappedEpisode.endSceneNumber - mappedEpisode.startSceneNumber + 1
      : null)
  const showProgress = isGenerating && progress

  const cardClass = [
    styles.root,
    isComplete ? styles.rootCompleted : '',
    isGenerating ? styles.rootGenerating : '',
    isFailed ? styles.rootFailed : '',
  ]
    .filter(Boolean)
    .join(' ')

  const handleGenerate = () => {
    startGeneration({ force: isFailed })
  }

  const handleViewStoryboard = () => {
    navigate(projectEpisodeStoryboardPath(projectId, mappedEpisode.id))
  }

  return (
    <article className={cardClass}>
      <div className={styles.header}>
        <div className={styles.cover} aria-hidden="true">
          {mappedEpisode.episodeNumber}
        </div>
        <div className={styles.meta}>
          <p className={styles.episodeNumber}>Episode {mappedEpisode.episodeNumber}</p>
          <h3 className={styles.title}>
            {mappedEpisode.title || `Episode ${mappedEpisode.episodeNumber}`}
          </h3>
          {mappedEpisode.summary ? (
            <p className={styles.summary}>{mappedEpisode.summary}</p>
          ) : null}
          <p className={styles.subtitle}>
            Scenes {sceneRange}
            {estimatedScenes ? ` · ~${estimatedScenes} scene${estimatedScenes === 1 ? '' : 's'}` : ''}
          </p>
          <div className={styles.badges}>
            <span className={`${styles.badge} ${statusBadgeClass(sceneStatus)}`}>
              {sceneStatus}
            </span>
          </div>
        </div>
      </div>

      {showProgress ? <EpisodeProgress progress={progress} variant="scenes" /> : null}

      {isComplete ? <p className={styles.readyLabel}>✓ Scenes Ready</p> : null}

      <div className={styles.actions}>
        {!isComplete && !isGenerating ? (
          <button
            type="button"
            className={isFailed ? styles.retryBtn : styles.primaryBtn}
            onClick={handleGenerate}
            disabled={starting}
          >
            {isFailed ? 'Retry' : 'Generate Scenes'}
          </button>
        ) : null}

        {isComplete ? (
          <button type="button" className={styles.primaryBtn} onClick={handleViewStoryboard}>
            View Storyboard
          </button>
        ) : null}
      </div>
    </article>
  )
}
