import { formatCameraDisplay, formatDirectorReasoning } from './storyboardDirector'
import styles from './StoryboardDirectorPanel.module.css'

function SuggestionField({ label, value, multiline = false }) {
  const displayValue = String(value ?? '').trim() || '—'

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {multiline ? (
        <p className={styles.fieldValueMultiline}>{displayValue}</p>
      ) : (
        <p className={styles.fieldValue}>{displayValue}</p>
      )}
    </div>
  )
}

export default function StoryboardDirectorPanel({
  directorNotes,
  onDirectorNotesChange,
  suggestions,
  asking = false,
  onAskDirector,
  onApplySuggestions,
  disabled = false,
}) {
  const canAsk = !disabled && !asking && directorNotes.trim().length >= 3
  const canApply = !disabled && !asking && Boolean(suggestions)

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <label className={styles.sectionLabel} htmlFor="director-notes-input">
          Director Notes
        </label>
        <textarea
          id="director-notes-input"
          className={styles.notesInput}
          value={directorNotes}
          onChange={(event) => onDirectorNotesChange?.(event.target.value)}
          placeholder="Make this feel more emotional."
          rows={4}
          disabled={disabled || asking}
        />
        <button
          type="button"
          className={styles.askBtn}
          onClick={onAskDirector}
          disabled={!canAsk}
        >
          {asking ? 'Asking Director…' : 'Ask Director'}
        </button>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Suggestions</h3>
        {suggestions ? (
          <div className={styles.suggestionsGrid}>
            <SuggestionField label="Composition" value={suggestions.composition?.name} />
            <SuggestionField label="Camera" value={formatCameraDisplay(suggestions.camera)} />
            <SuggestionField label="Lighting" value={suggestions.lighting?.style} />
            <SuggestionField label="Mood" value={suggestions.mood} />
            <SuggestionField label="Color Palette" value={suggestions.color_palette} />
            <SuggestionField
              label="Updated Prompt"
              value={suggestions.updated_prompt}
              multiline
            />
            <SuggestionField
              label="Reasoning"
              value={formatDirectorReasoning(suggestions)}
              multiline
            />
          </div>
        ) : (
          <p className={styles.emptyHint}>
            Write a director note and click Ask Director to get suggestions.
          </p>
        )}
        <button
          type="button"
          className={styles.applyBtn}
          onClick={onApplySuggestions}
          disabled={!canApply}
        >
          Apply Suggestions
        </button>
      </section>
    </div>
  )
}
