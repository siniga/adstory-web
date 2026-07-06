import SelectableRegion from './SelectableRegion'
import styles from './CanvasSelectionLayer.module.css'

export default function CanvasSelectionLayer({
  regions,
  selectedRegionId,
  onSelectRegion,
  visible,
  selectedRegion,
}) {
  if (!visible) return null

  return (
    <>
      <div className={styles.layer} role="group" aria-label="Selectable asset regions">
        {regions.map((region) => (
          <SelectableRegion
            key={region.id}
            region={region}
            selected={selectedRegionId === region.id}
            onSelect={onSelectRegion}
          />
        ))}
      </div>
      {selectedRegion && (
        <div className={styles.selectionLabel} aria-live="polite">
          Selected: {selectedRegion.regionLabel} — {selectedRegion.name}
        </div>
      )}
    </>
  )
}
