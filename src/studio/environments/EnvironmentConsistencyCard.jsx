import styles from './EnvironmentConsistencyCard.module.css'

const CONSISTENCY_OPTIONS = [
  { key: 'keepLocation', label: 'Keep Location Consistent' },
  { key: 'keepTimeOfDay', label: 'Keep Time of Day Consistent' },
  { key: 'keepWeather', label: 'Keep Weather Consistent' },
  { key: 'keepLighting', label: 'Keep Lighting Consistent' },
  { key: 'keepColorPalette', label: 'Keep Color Palette Consistent' },
]

export default function EnvironmentConsistencyCard({ consistency }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Environment Consistency</h3>
      <ul className={styles.list}>
        {CONSISTENCY_OPTIONS.map((option) => (
          <li key={option.key}>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                defaultChecked={consistency[option.key]}
              />
              <span>{option.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  )
}
