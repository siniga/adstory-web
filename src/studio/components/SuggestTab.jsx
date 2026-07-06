import { IconSparkle } from '../icons'
import styles from './SuggestTab.module.css'

const SUGGESTION_TYPES = [
  { key: 'composition', label: 'Composition' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'environment', label: 'Environment' },
  { key: 'character', label: 'Character' },
]

export default function SuggestTab({ shot }) {
  return (
    <div className={styles.suggest}>
      <div className={styles.header}>
        <IconSparkle />
        <span>AI Creative Suggestions</span>
      </div>
      <div className={styles.cardList}>
        {SUGGESTION_TYPES.map((type) => (
          <article key={type.key} className={styles.card}>
            <span className={styles.cardType}>{type.label}</span>
            <p className={styles.cardText}>{shot.suggestions?.[type.key]}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
