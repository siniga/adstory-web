import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import styles from './AssignmentSection.module.css'

export default function EnvironmentAssignmentSection({
  environment,
  onChangeClick,
  onRemove,
  removing = false,
}) {
  const meta = environment
    ? [environment.type, environment.location].filter(Boolean).join(' · ')
    : ''

  return (
    <section className={styles.section}>
      <h3 className={styles.sectionTitle}>Environment</h3>
      {environment ? (
        <div className={styles.envCard}>
          <span className={styles.assetEmoji} aria-hidden="true">
            🌍
          </span>
          <span
            className={styles.envThumb}
            style={buildMediaThumbStyle(
              environment.previewImage,
              environment.thumbnailGradient
            )}
            aria-hidden="true"
          />
          <span className={styles.envMeta}>
            <span className={styles.envName}>{environment.name}</span>
            {meta ? <span className={styles.envDetail}>{meta}</span> : null}
          </span>
          {onRemove ? (
            <button
              type="button"
              className={styles.chipRemoveBtn}
              onClick={onRemove}
              disabled={removing}
              aria-label={`Remove ${environment.name}`}
              title="Remove"
            >
              ×
            </button>
          ) : null}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyStateText}>No environment selected.</p>
        </div>
      )}
      <button type="button" className={styles.primaryActionBtn} onClick={onChangeClick}>
        Change Environment
      </button>
    </section>
  )
}
