import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import { IconChevronLeft } from '../icons'
import EnvironmentConsistencyCard from './EnvironmentConsistencyCard'
import styles from './EnvironmentDetailsPanel.module.css'

function DetailField({ label, value }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input className={styles.input} type="text" defaultValue={value} readOnly />
    </label>
  )
}

function DetailTextarea({ label, value }) {
  return (
    <label className={styles.textareaField}>
      <span className={styles.fieldLabel}>{label}</span>
      <textarea className={styles.textarea} rows={3} defaultValue={value} readOnly />
    </label>
  )
}

export default function EnvironmentDetailsPanel({ environment, onBack, onOpenEnvironmentEditor }) {
  const thumbStyle = buildMediaThumbStyle(
    environment.previewImage,
    environment.thumbnailGradient
  )

  return (
    <div className={styles.panel}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        <IconChevronLeft />
        <span>All Environments</span>
      </button>

      <div className={styles.hero}>
        <div className={styles.heroImage} style={thumbStyle} aria-hidden="true" />
        <div className={styles.heroMeta}>
          <DetailField label="Name" value={environment.name} />
          <DetailField label="Type" value={environment.type} />
          <DetailField label="Mood" value={environment.mood} />
        </div>
      </div>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Environment Details</h3>
        <div className={styles.fieldGrid}>
          <DetailField label="Location" value={environment.location} />
          <DetailField label="Time of Day" value={environment.timeOfDay} />
          <DetailField label="Weather" value={environment.weather} />
          <DetailField label="Lighting Style" value={environment.lightingStyle} />
          <DetailField label="Color Palette" value={environment.colorPalette} />
        </div>
        <DetailTextarea label="Description" value={environment.description} />
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Used In</h3>
        <div className={styles.usedIn}>
          {environment.usedIn.length > 0 ? (
            environment.usedIn.map((entry) => (
              <div key={entry.sceneId} className={styles.usedScene}>
                <span className={styles.sceneTag}>Scene {entry.sceneId}</span>
                <div className={styles.shotList}>
                  {entry.shots.map((shotId) => (
                    <span key={shotId} className={styles.shotTag}>
                      Shot {shotId}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className={styles.usedEmpty}>Not assigned to any scenes yet.</p>
          )}
        </div>
      </section>

      <EnvironmentConsistencyCard consistency={environment.consistency} />

      {onOpenEnvironmentEditor && (
        <button
          type="button"
          className={styles.editEnvironmentBtn}
          onClick={() => onOpenEnvironmentEditor(environment.id)}
        >
          Edit Environment
        </button>
      )}
    </div>
  )
}
