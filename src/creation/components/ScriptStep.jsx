import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWorkspaceQuestion } from '../creationData'
import { MIN_SCRIPT_LENGTH, validateScript } from '../../services/adstoryApi'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import StepHeader from './StepHeader'
import styles from './StepLayout.module.css'

export default function ScriptStep({
  script,
  style,
  onActionChange,
  onNext,
  onSave,
  generating,
  loading = false,
  saveStatus = 'idle',
  saveError,
}) {
  const [value, setValue] = useState(script)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  const validationError = useMemo(() => validateScript(value), [value])
  const showValidationError = touched && validationError
  const isSaving = saveStatus === 'saving'
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null

  useEffect(() => {
    setValue(script)
  }, [script])

  const handleSave = useCallback(async () => {
    setTouched(true)
    if (validationError) {
      return
    }
    await onSave?.(value.trim())
  }, [onSave, validationError, value])

  useEffect(() => {
    if (!onActionChange) {
      return undefined
    }

    onActionChange({
      label: 'Continue to Screenplay',
      generatingLabel: 'Generating Screenplay...',
      disabled: Boolean(validationError) || generating || isSaving,
      onClick: () => {
        setTouched(true)
        if (validationError) {
          return
        }

        onNext({
          script: value.trim(),
          style,
        })
      },
    })

    return () => onActionChange(null)
  }, [generating, isSaving, onActionChange, onNext, style, validationError, value])

  return (
    <div className={styles.step}>
      <StepHeader
        stepNumber={2}
        title="Script"
        question={getWorkspaceQuestion('script')}
        subtitle="Read it aloud in your head. Adjust dialogue, action lines, and pacing."
        onFullscreen={() => setFullscreenOpen(true)}
      />
      {loading ? (
        <p className={styles.generationStatus} role="status">
          Loading saved script...
        </p>
      ) : null}
      {generating ? (
        <p className={styles.generationStatus} role="status">
          Adstory is formatting your script into a screenplay...
        </p>
      ) : null}
      <div className={styles.readingRoom}>
        <div className={styles.toolbarRow}>
          <button
            type="button"
            className={`${styles.secondaryBtnActive} ${styles.toolbarBtn}`}
            onClick={handleSave}
            disabled={generating || isSaving || Boolean(validationError)}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          {saveStatusLabel ? (
            <span className={styles.saveStatusInline} role="status">
              {saveStatusLabel}
            </span>
          ) : null}
        </div>
        <textarea
          className={styles.textareaBlock}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-label="Script content"
          aria-invalid={showValidationError ? 'true' : undefined}
          aria-describedby={showValidationError ? 'script-validation-error' : undefined}
        />
      </div>
      {showValidationError ? (
        <p id="script-validation-error" className={styles.fieldError} role="alert">
          {validationError}
        </p>
      ) : saveError ? (
        <p className={styles.fieldError} role="alert">
          {saveError}
        </p>
      ) : (
        <p className={styles.fieldHint}>
          At least {MIN_SCRIPT_LENGTH} characters ({value.trim().length}/{MIN_SCRIPT_LENGTH})
        </p>
      )}
      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        eyebrow="Step 2 of 6"
        title="Script"
        subtitle="Review and edit your generated script. Adjust dialogue, action lines, and pacing."
      >
        <textarea
          className={readerStyles.textareaBlock}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Script content"
        />
      </CreationFullscreenReader>
    </div>
  )
}
