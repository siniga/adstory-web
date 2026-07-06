import styles from './ShotLookSection.module.css'

const LOOK_FIELDS = [
  { key: 'composition', label: 'Composition', fallbackKey: null },
  { key: 'shotSize', label: 'Shot size', fallbackKey: null },
  { key: 'camera', label: 'Camera', fallbackKey: null },
  { key: 'lighting', label: 'Lighting', fallbackKey: 'lighting' },
  { key: 'lens', label: 'Lens', fallbackKey: null },
  { key: 'timeOfDay', label: 'Time', fallbackKey: null },
  { key: 'mood', label: 'Mood', fallbackKey: null },
]

function resolveLookValue(shot, field) {
  const fromPresets = shot?.presets?.[field.key]
  if (fromPresets) return fromPresets
  if (field.fallbackKey) return shot?.[field.fallbackKey] ?? null
  return null
}

export default function ShotLookSection({ shot }) {
  const rows = LOOK_FIELDS.map((field) => ({
    label: field.label,
    value: resolveLookValue(shot, field),
  })).filter((row) => row.value)

  if (!rows.length) {
    return <p className={styles.empty}>No look presets set for this shot.</p>
  }

  return (
    <dl className={styles.list}>
      {rows.map((row) => (
        <div key={row.label} className={styles.row}>
          <dt className={styles.label}>{row.label}</dt>
          <dd className={styles.value}>{row.value}</dd>
        </div>
      ))}
    </dl>
  )
}
