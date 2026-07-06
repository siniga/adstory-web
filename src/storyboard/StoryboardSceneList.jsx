import styles from './StoryboardSceneList.module.css'

export default function StoryboardSceneList({
  scenes = [],
  selectedSceneId,
  selectedShotId,
  onSelectScene,
  onSelectShot,
}) {
  return (
    <aside className={styles.sidebar} aria-label="Scenes and shots">
      {scenes.map((scene) => {
        const sceneActive = selectedSceneId === scene.id

        return (
          <section key={scene.id} className={styles.sceneBlock}>
            <button
              type="button"
              className={`${styles.sceneBtn} ${sceneActive ? styles.sceneBtnActive : ''}`}
              onClick={() => onSelectScene(scene.id)}
            >
              <span className={styles.sceneNumber}>Scene {scene.id}</span>
              <span className={styles.sceneTitle}>{scene.title}</span>
            </button>

            {sceneActive ? (
              <ul className={styles.shotList}>
                {scene.shots.map((shot) => (
                  <li key={shot.id}>
                    <button
                      type="button"
                      className={`${styles.shotBtn} ${
                        selectedShotId === shot.id ? styles.shotBtnActive : ''
                      }`}
                      onClick={() => onSelectShot(shot.id)}
                    >
                      <span className={styles.shotId}>{shot.id}</span>
                      <span className={styles.shotLabel}>{shot.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        )
      })}
    </aside>
  )
}
