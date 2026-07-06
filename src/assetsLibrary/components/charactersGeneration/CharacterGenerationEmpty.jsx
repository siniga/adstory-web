import styles from './CharacterGenerationEmpty.module.css'

export default function CharacterGenerationEmpty({ onGenerate, generating = false }) {
  return (
    <div className={styles.empty}>
      <div className={styles.illustration} aria-hidden="true">
        <span className={styles.orb} />
        <span className={styles.orbSecondary} />
        <span className={styles.icon}>✦</span>
      </div>
      <p className={styles.message}>No characters have been discovered yet.</p>
      {onGenerate ? (
        <button
          type="button"
          className={styles.generateBtn}
          onClick={onGenerate}
          disabled={generating}
        >
          {generating ? 'Generating…' : 'Generate Characters'}
        </button>
      ) : null}
    </div>
  )
}
