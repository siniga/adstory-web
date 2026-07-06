import GenerationProgress from './GenerationProgress'
import styles from './Episodes.module.css'

export default function EpisodeProgress({ progress, startedAt, variant = 'scenes' }) {
  if (!progress) return null

  const label =
    variant === 'shots' ? 'Generating shots…' : 'Generating scenes…'

  return (
    <GenerationProgress
      progress={progress}
      startedAt={startedAt}
      activeLabel={label}
      compact
      showStats
    />
  )
}
