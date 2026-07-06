import {
  formatReferenceTypeLabel,
  getGenerationReferenceGroups,
  getShotGenerationMeta,
  shotHasGenerationReferences,
} from './shotGenerationReferences'
import styles from './ShotGenerationReferencesSection.module.css'

export default function ShotGenerationReferencesSection({ shot }) {
  const groups = getGenerationReferenceGroups(shot)
  const { referenceImagesAttached } = getShotGenerationMeta(shot)
  const attachedCount = Number(referenceImagesAttached)
  const hasAttachedCount = Number.isFinite(attachedCount)
  const hasReferences = shotHasGenerationReferences(shot)

  if (!hasReferences) {
    return (
      <p className={styles.empty}>No visual references were attached for this shot.</p>
    )
  }

  return (
    <div className={styles.section}>
      {groups.map((group) => (
        <div key={group.characterName} className={styles.characterGroup}>
          <h4 className={styles.characterName}>{group.characterName}</h4>
          <ul className={styles.referenceList}>
            {group.referenceTypes.map((referenceType) => (
              <li key={`${group.characterName}-${referenceType}`} className={styles.referenceItem}>
                {formatReferenceTypeLabel(referenceType)}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {hasAttachedCount ? (
        <p className={styles.attachedCount}>
          Reference images attached: {attachedCount}
        </p>
      ) : null}
    </div>
  )
}
