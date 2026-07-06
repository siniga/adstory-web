import styles from './ObjectConsistencyCard.module.css'

const CONSISTENCY_OPTIONS = [
  { key: 'keepShape', label: 'Keep Shape Consistent' },
  { key: 'keepMaterial', label: 'Keep Material Consistent' },
  { key: 'keepColor', label: 'Keep Color Consistent' },
  { key: 'keepScale', label: 'Keep Scale Consistent' },
]

export default function ObjectConsistencyCard({ consistency }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Object Consistency Settings</h3>
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
