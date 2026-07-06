import { getAssetTypeLabel, getEditActionLabel } from './selectableRegionsData'
import styles from './SelectedAssetPanel.module.css'

export default function SelectedAssetPanel({
  selectedRegion,
  sceneId,
  shotId,
  onEditCharacter,
  onEditEnvironment,
  onEditObject,
}) {
  if (!selectedRegion) return null

  const canEditCharacter = selectedRegion.type === 'character' && selectedRegion.assetId
  const canEditEnvironment = selectedRegion.type === 'environment' && selectedRegion.assetId
  const canEditObject = selectedRegion.type === 'object' && selectedRegion.assetId
  const canEdit = canEditCharacter || canEditEnvironment || canEditObject

  const handleEdit = () => {
    if (canEditCharacter) {
      onEditCharacter?.(selectedRegion.assetId)
    } else if (canEditEnvironment) {
      onEditEnvironment?.(selectedRegion.assetId)
    } else if (canEditObject) {
      onEditObject?.(selectedRegion.assetId)
    }
  }

  return (
    <section className={styles.panel} aria-label="Selected asset">
      <h3 className={styles.title}>Selected Asset</h3>

      <dl className={styles.meta}>
        <div className={styles.row}>
          <dt className={styles.label}>Type:</dt>
          <dd className={styles.value}>{getAssetTypeLabel(selectedRegion.type)}</dd>
        </div>
        <div className={styles.row}>
          <dt className={styles.label}>Name:</dt>
          <dd className={styles.value}>{selectedRegion.name}</dd>
        </div>
      </dl>

      <div className={styles.usedIn}>
        <span className={styles.usedLabel}>Used In:</span>
        <span className={styles.usedValue}>
          Scene {sceneId ?? '—'}
          <br />
          Shot {shotId}
        </span>
      </div>

      <button
        type="button"
        className={styles.editBtn}
        onClick={handleEdit}
        disabled={!canEdit}
      >
        {getEditActionLabel(selectedRegion.type)}
      </button>
    </section>
  )
}
