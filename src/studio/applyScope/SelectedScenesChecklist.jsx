import { getProjectScenes } from './applyScopeData'
import styles from './ApplyScopeModal.module.css'

export default function SelectedScenesChecklist({ selectedIds, onToggle }) {
  const scenes = getProjectScenes()
  return (
    <section className={styles.sceneChecklist} aria-label="Selected scenes">
      <h4 className={styles.sectionTitle}>Select Scenes</h4>
      <ul className={styles.sceneList}>
        {scenes.map((scene) => (
          <li key={scene.id}>
            <label className={styles.sceneRow}>
              <input
                type="checkbox"
                checked={selectedIds.includes(scene.id)}
                onChange={() => onToggle(scene.id)}
              />
              <span>{scene.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
