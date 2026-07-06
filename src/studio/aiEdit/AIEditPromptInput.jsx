import { PROMPT_PLACEHOLDER } from './aiEditData'
import styles from './AIEditPanel.module.css'

export default function AIEditPromptInput({ value, onChange }) {
  return (
    <section className={styles.section}>
      <label className={styles.promptLabel} htmlFor="ai-edit-prompt">
        Prompt
      </label>
      <textarea
        id="ai-edit-prompt"
        className={styles.promptInput}
        rows={8}
        placeholder={PROMPT_PLACEHOLDER}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </section>
  )
}
