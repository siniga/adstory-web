import ShotList from './ShotList'
import styles from './Episodes.module.css'

function shotStatusLabel(scene) {
  const status = scene.shot_generation_status
  if (status === 'completed') return 'Completed'
  if (status === 'generating') return 'Generating…'
  if (status === 'failed') return 'Failed'
  if (scene.shots?.length) return 'Completed'
  return 'Not Generated'
}

export default function SceneCard({
  scene,
  onGenerateShots,
  generating = false,
  disabled = false,
}) {
  const status = shotStatusLabel(scene)
  const hasShots = (scene.shots?.length ?? 0) > 0
  const isGenerating = status === 'Generating…' || generating

  return (
    <article className={styles.sceneCard}>
      <div className={styles.sceneHeader}>
        <div>
          <h3 className={styles.sceneTitle}>
            Scene {scene.scene_number ?? '—'}
            {scene.title ? `: ${scene.title}` : ''}
          </h3>
          {scene.description ? (
            <p className={styles.sceneDescription}>{scene.description}</p>
          ) : null}
        </div>
        <div className={styles.actions}>
          {!hasShots && !isGenerating ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => onGenerateShots?.()}
              disabled={disabled}
            >
              Generate Shots
            </button>
          ) : null}
          {hasShots && !isGenerating ? (
            <span className={`${styles.badge} ${styles.badgeCompleted}`}>Shots: {status}</span>
          ) : null}
          {isGenerating ? (
            <span className={`${styles.badge} ${styles.badgeGenerating}`}>Shots: Generating…</span>
          ) : null}
        </div>
      </div>

      {hasShots ? <ShotList shots={scene.shots} /> : null}
      {isGenerating && !hasShots ? (
        <p className={styles.generatingHint}>Generating shots for this scene…</p>
      ) : null}
    </article>
  )
}
