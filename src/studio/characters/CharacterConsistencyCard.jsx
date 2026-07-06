import styles from './CharacterConsistencyCard.module.css'

const CONSISTENCY_OPTIONS = [
  { key: 'keepFace', label: 'Keep Face Consistent' },
  { key: 'keepOutfit', label: 'Keep Outfit Consistent' },
  { key: 'keepHair', label: 'Keep Hair Consistent' },
  { key: 'keepAccessories', label: 'Keep Accessories Consistent' },
]

export default function CharacterConsistencyCard({ consistency }) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Consistency Settings</h3>
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
