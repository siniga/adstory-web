import styles from './SelectableRegion.module.css'

export default function SelectableRegion({ region, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`${styles.region} ${selected ? styles.regionSelected : ''}`}
      style={{
        top: `${region.top}%`,
        left: `${region.left}%`,
        width: `${region.width}%`,
        height: `${region.height}%`,
      }}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(region.id)
      }}
      aria-label={`Select ${region.regionLabel}: ${region.name}`}
      aria-pressed={selected}
    >
      <span className={styles.label}>{region.regionLabel}</span>
    </button>
  )
}
