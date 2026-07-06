import styles from './Sceneboard.module.css'

export default function SceneboardEmptyState({ onGenerate, generating = false }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon} aria-hidden="true">
        🎬
      </span>
      <h3 className={styles.emptyTitle}>Start Storyboarding</h3>
      <p className={styles.emptyText}>
        This scene is ready to be transformed into cinematic shots.
      </p>
      <button
        type="button"
        className={styles.primaryBtn}
        onClick={onGenerate}
        disabled={generating}
      >
        {generating ? 'Starting…' : 'Generate Shots'}
      </button>
    </div>
  )
}
