import styles from './AssignmentSection.module.css'

export default function ObjectAssignmentSection({
  objects,
  onManageClick,
  onRemoveObject,
  removingObjectId = null,
}) {
  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Objects</h3>
      {objects.length > 0 ? (
        <div className={styles.objectGrid}>
          {objects.map((object) => (
            <div key={object.id} className={styles.objectChip}>
              <span className={styles.assetEmoji} aria-hidden="true">
                📦
              </span>
              <span
                className={styles.objectThumb}
                style={{ background: object.thumbnailGradient }}
                aria-hidden="true"
              />
              <span className={styles.objectName}>{object.name}</span>
              {onRemoveObject ? (
                <button
                  type="button"
                  className={styles.chipRemoveBtn}
                  onClick={() => onRemoveObject(object.id)}
                  disabled={removingObjectId === Number(object.id)}
                  aria-label={`Remove ${object.name}`}
                  title="Remove"
                >
                  ×
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>No objects attached.</p>
        </div>
      )}
      <button type="button" className={styles.primaryActionBtn} onClick={onManageClick}>
        Manage Objects
      </button>
    </section>
  )
}
