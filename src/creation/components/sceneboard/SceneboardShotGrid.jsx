import SceneboardShotCard from './SceneboardShotCard'
import styles from './Sceneboard.module.css'

export default function SceneboardShotGrid({ shots = [], onSelectShot }) {
  return (
    <div className={styles.shotGrid}>
      {shots.map((shot, index) => (
        <SceneboardShotCard
          key={shot.apiId ?? shot.id ?? index}
          shot={shot}
          index={index}
          onSelect={onSelectShot}
        />
      ))}
    </div>
  )
}
