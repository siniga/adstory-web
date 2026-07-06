import styles from './Sceneboard.module.css'

export default function SceneboardSceneGenerationProgress() {
  return (
    <div className={styles.sceneGenerationPanel} aria-live="polite">
      <h3 className={styles.sceneGenerationTitle}>Generating scenes from screenplay…</h3>
      <p className={styles.sceneGenerationHint}>
        Scenes will appear in the list as they are created.
      </p>
    </div>
  )
}
