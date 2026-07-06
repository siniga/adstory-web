import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAdstoryEpisode, getEpisodeStoryboard } from '../../../services/adstoryApi'
import { projectEpisodesPath } from '../../../routes/paths'
import { formatUserFriendlyError } from '../../../utils/userFriendlyErrors'
import useEpisodeShotGeneration from '../../hooks/useEpisodeShotGeneration'
import {
  isEpisodeShotGenerationActive,
  isEpisodeShotGenerationComplete,
  mapAdstoryEpisode,
} from '../../episodeGenerationStatus'
import EpisodeProgress from './EpisodeProgress'
import SceneCard from './SceneCard'
import styles from './Episodes.module.css'

export default function EpisodeStoryboard({
  projectId,
  episodeId,
  visualStyle = '',
}) {
  const navigate = useNavigate()
  const [episode, setEpisode] = useState(null)
  const [scenes, setScenes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadStoryboard = useCallback(async () => {
    if (!projectId || !episodeId) return

    setLoading(true)
    setError(null)

    try {
      const [episodeResult, storyboard] = await Promise.all([
        getAdstoryEpisode(projectId, episodeId),
        getEpisodeStoryboard(projectId, episodeId),
      ])

      setEpisode(mapAdstoryEpisode(episodeResult.episode))
      setScenes(storyboard.scenes ?? [])
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to load storyboard'
      ).message
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [episodeId, projectId])

  useEffect(() => {
    loadStoryboard()
  }, [loadStoryboard])

  const handleEpisodeUpdate = useCallback((nextEpisode) => {
    setEpisode(nextEpisode)
  }, [])

  const handleScenesUpdate = useCallback((nextScenes) => {
    setScenes(nextScenes)
  }, [])

  const handleGenerationError = useCallback((formatted) => {
    setError(formatted?.message ?? formatted ?? 'Shot generation failed')
  }, [])

  const {
    progress,
    monitoring,
    starting,
    startGeneration,
  } = useEpisodeShotGeneration({
    projectId,
    episodeId,
    episode,
    visualStyle,
    enabled: Boolean(episode?.id) && !loading,
    scenes,
    onEpisodeChange: handleEpisodeUpdate,
    onScenesChange: handleScenesUpdate,
    onError: handleGenerationError,
  })

  const shotsGenerating =
    isEpisodeShotGenerationActive(episode) || monitoring || starting
  const shotsComplete = isEpisodeShotGenerationComplete(episode)

  const handleGenerateAllShots = () => {
    startGeneration({ force: false })
  }

  return (
    <div className={styles.content}>
      <button
        type="button"
        className={styles.backLink}
        onClick={() => navigate(projectEpisodesPath(projectId))}
      >
        ← Back to Episodes
      </button>

      {loading ? (
        <p className={styles.statusMessage} role="status">
          Loading episode storyboard…
        </p>
      ) : null}

      {error ? <div className={styles.errorBox} role="alert">{error}</div> : null}

      {episode ? (
        <header className={styles.storyboardHeader}>
          <div>
            <h1 className={styles.pageTitle}>
              Episode {episode.episodeNumber}
              {episode.title ? `: ${episode.title}` : ''}
            </h1>
            {episode.summary ? (
              <p className={styles.pageSubtitle}>{episode.summary}</p>
            ) : null}
          </div>
          <div className={styles.storyboardActions}>
            {!shotsComplete && !shotsGenerating ? (
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleGenerateAllShots}
                disabled={starting}
              >
                Generate Shots
              </button>
            ) : null}
            {shotsGenerating ? (
              <button type="button" className={styles.secondaryBtn} disabled>
                Generating Shots…
              </button>
            ) : null}
            <button type="button" className={styles.placeholderBtn} disabled title="Coming Next">
              Generate Characters · Coming Next
            </button>
            <button type="button" className={styles.placeholderBtn} disabled title="Coming Next">
              Generate Environments · Coming Next
            </button>
          </div>
        </header>
      ) : null}

      {shotsGenerating && progress ? (
        <EpisodeProgress progress={progress} variant="shots" />
      ) : null}

      <div className={styles.sceneList}>
        {scenes.map((scene) => (
          <SceneCard
            key={scene.id ?? scene.scene_number}
            scene={scene}
            generating={
              scene.shot_generation_status === 'generating' ||
              (shotsGenerating && !(scene.shots?.length))
            }
            disabled={shotsGenerating || starting}
            onGenerateShots={handleGenerateAllShots}
          />
        ))}
      </div>

      {!loading && !scenes.length ? (
        <p className={styles.statusMessage}>
          No scenes yet. Generate scenes for this episode from the Episodes page.
        </p>
      ) : null}
    </div>
  )
}
