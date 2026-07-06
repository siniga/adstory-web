import { useCallback, useEffect, useRef, useState } from 'react'
import { getFullAdstoryProject, planAdstoryEpisodes } from '../../../services/adstoryApi'
import { formatUserFriendlyError } from '../../../utils/userFriendlyErrors'
import { getWorkspaceQuestion } from '../../creationData'
import {
  allEpisodesScenesComplete,
  mapAdstoryEpisodes,
  mergeEpisodes,
} from '../../episodeGenerationStatus'
import EpisodeCard from './EpisodeCard'
import EpisodePlanningPanel from './EpisodePlanningPanel'
import styles from './Episodes.module.css'

export default function EpisodesStep({
  projectId,
  episodes = [],
  visualStyle = '',
  onEpisodesChange,
  onBack,
  onContinueToCharacters,
  loading = false,
}) {
  const [items, setItems] = useState(episodes)
  const [analyzing, setAnalyzing] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [error, setError] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    if (projectIdRef.current !== projectId) {
      projectIdRef.current = projectId
      setInitialLoadDone(false)
      setItems([])
    }
  }, [projectId])

  useEffect(() => {
    if (!episodes.length) return
    setItems((current) => mergeEpisodes(current, episodes))
  }, [episodes])

  const updateEpisode = useCallback(
    (nextEpisode) => {
      setItems((current) => {
        const next = current.map((episode) =>
          String(episode.id) === String(nextEpisode.id)
            ? { ...episode, ...nextEpisode }
            : episode
        )
        onEpisodesChange?.(next)
        return next
      })
    },
    [onEpisodesChange]
  )

  const loadEpisodes = useCallback(async () => {
    if (!projectId) return []

    setLoadingEpisodes(true)
    setError(null)

    try {
      const project = await getFullAdstoryProject(projectId)
      const loaded = mapAdstoryEpisodes(project.episodes ?? project.episodes_summary ?? [])
      setItems(loaded)
      onEpisodesChange?.(loaded)
      return loaded
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to load episodes'
      ).message
      setError(message)
      return []
    } finally {
      setLoadingEpisodes(false)
    }
  }, [onEpisodesChange, projectId])

  useEffect(() => {
    if (!projectId || loading || initialLoadDone) return

    let cancelled = false

    const initialize = async () => {
      await loadEpisodes()
      if (!cancelled) {
        setInitialLoadDone(true)
      }
    }

    initialize()

    return () => {
      cancelled = true
    }
  }, [initialLoadDone, loadEpisodes, loading, projectId])

  const handleAnalyzeScreenplay = useCallback(async () => {
    if (!projectId || analyzing) return

    setAnalyzing(true)
    setError(null)

    try {
      const result = await planAdstoryEpisodes(projectId)

      if (result.episodes?.length) {
        const planned = mapAdstoryEpisodes(result.episodes)
        setItems(planned)
        onEpisodesChange?.(planned)
      } else {
        await loadEpisodes()
      }
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to plan episodes'
      ).message
      setError(message)
    } finally {
      setAnalyzing(false)
    }
  }, [analyzing, loadEpisodes, onEpisodesChange, projectId])

  const handleCardError = useCallback((formatted) => {
    setError(formatted?.message ?? formatted ?? 'Episode generation failed')
  }, [])

  const episodesReady = allEpisodesScenesComplete(items)
  const showPlanningPanel = initialLoadDone && !loadingEpisodes && items.length === 0
  const showEpisodeGrid = items.length > 0

  const handleContinue = async () => {
    setContinuing(true)
    setError(null)
    try {
      await onContinueToCharacters?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to continue')
    } finally {
      setContinuing(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.headerBlock}>
          <h1 className={styles.pageTitle}>Episodes</h1>
          <p className={styles.pageSubtitle}>{getWorkspaceQuestion('episodes')}</p>
          {showEpisodeGrid ? (
            <p className={styles.statusMessage}>
              {items.length} episode{items.length === 1 ? '' : 's'}
            </p>
          ) : null}
        </header>

        {error ? <div className={styles.errorBox} role="alert">{error}</div> : null}

        {!initialLoadDone || loadingEpisodes || loading ? (
          <p className={styles.statusMessage} role="status">
            Loading episodes…
          </p>
        ) : null}

        {showPlanningPanel ? (
          <EpisodePlanningPanel analyzing={analyzing} onAnalyze={handleAnalyzeScreenplay} />
        ) : null}

        {showEpisodeGrid ? (
          <div className={styles.episodesGrid}>
            {items.map((episode) => (
              <EpisodeCard
                key={episode.id ?? episode.episodeNumber}
                episode={episode}
                projectId={projectId}
                visualStyle={visualStyle}
                enabled={!loading && initialLoadDone}
                onEpisodeChange={updateEpisode}
                onError={handleCardError}
              />
            ))}
          </div>
        ) : null}
      </div>

      <footer className={styles.footer}>
        <button type="button" className={`${styles.footerBtn} ${styles.footerBack}`} onClick={onBack}>
          Back to Screenplay
        </button>
        <button
          type="button"
          className={`${styles.footerBtn} ${styles.footerContinue}`}
          onClick={handleContinue}
          disabled={!episodesReady || continuing || analyzing}
        >
          {continuing ? 'Continuing…' : 'Continue to Characters'}
        </button>
      </footer>
    </div>
  )
}
