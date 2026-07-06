import { IconChevronLeft } from '../icons'
import ObjectConsistencyCard from './ObjectConsistencyCard'
import styles from './ObjectDetailsPanel.module.css'

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

function DetailSection({ title, children }) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>{title}</h3>
      <div className={styles.fieldGrid}>{children}</div>
    </section>
  )
}

export default function ObjectDetailsPanel({ object, onBack, onOpenObjectEditor }) {
  return (
    <div className={styles.panel}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        <IconChevronLeft />
        <span>All Objects</span>
      </button>

      <div className={styles.hero}>
        <div
          className={styles.heroImage}
          style={{ background: object.thumbnailGradient }}
          aria-hidden="true"
        />
        <div className={styles.heroMeta}>
          <DetailField label="Name" value={object.name} />
          <DetailField label="Category" value={object.categoryLabel} />
        </div>
      </div>

      <DetailTextarea label="Description" value={object.description} />

      <DetailSection title="Material">
        <DetailField label="Material" value={object.material} />
        <DetailField label="Condition" value={object.condition} />
      </DetailSection>

      <DetailSection title="Color">
        <DetailField label="Primary Color" value={object.primaryColor} />
        <DetailField label="Secondary Color" value={object.secondaryColor} />
      </DetailSection>

      <DetailSection title="Scale">
        <DetailField label="Scale" value={object.scale} />
      </DetailSection>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Object Usage</h3>
        <div className={styles.usedIn}>
          {object.usedIn.length > 0 ? (
            object.usedIn.map((entry) => (
              <div key={`${entry.sceneId}-${entry.shots.join('-')}`} className={styles.usedScene}>
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

      <ObjectConsistencyCard consistency={object.consistency} />

      {onOpenObjectEditor && (
        <button
          type="button"
          className={styles.editObjectBtn}
          onClick={() => onOpenObjectEditor(object.id)}
        >
          Edit Object
        </button>
      )}
    </div>
  )
}
