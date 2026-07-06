import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWorkspaceQuestion } from '../creationData'
import { MIN_SCREENPLAY_LENGTH, validateScreenplay } from '../../services/adstoryApi'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import StepHeader from './StepHeader'
import styles from './StepLayout.module.css'

export default function ScreenplayStep({
  screenplay,
  style,
  onActionChange,
  onBackToScript,
  onContinueToScenes,
  onSave,
  generating,
  loading = false,
  saveStatus = 'idle',
  saveError,
}) {
  const [value, setValue] = useState(screenplay)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  const validationError = useMemo(() => validateScreenplay(value), [value])
  const showValidationError = touched && validationError
  const isSaving = saveStatus === 'saving'
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null

  useEffect(() => {
    setValue(screenplay)
  }, [screenplay])

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
      label: 'Continue to Episodes',
      generatingLabel: 'Generating Scenes...',
      secondaryAction: {
        label: 'Back to Script',
        onClick: () => onBackToScript(value.trim()),
        disabled: generating || isSaving,
      },
      disabled: Boolean(validationError) || generating || isSaving,
      onClick: () => {
        setTouched(true)
        if (validationError) {
          return
        }

        onContinueToScenes({
          screenplay: value.trim(),
          style,
        })
      },
    })

    return () => onActionChange(null)
  }, [
    generating,
    isSaving,
    onActionChange,
    onBackToScript,
    onContinueToScenes,
    style,
    validationError,
    value,
  ])

  return (
    <div className={styles.step}>
      <StepHeader
        stepNumber={3}
        title="Screenplay"
        question={getWorkspaceQuestion('screenplay')}
        subtitle="How it plays on screen. Review formatting before breaking into scenes."
        onFullscreen={() => setFullscreenOpen(true)}
      />
      {loading ? (
        <p className={styles.generationStatus} role="status">
          Loading saved screenplay...
        </p>
      ) : null}
      {generating ? (
        <p className={styles.generationStatus} role="status">
          Adstory is breaking your screenplay into production scenes...
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
          aria-label="Screenplay content"
          aria-invalid={showValidationError ? 'true' : undefined}
          aria-describedby={showValidationError ? 'screenplay-validation-error' : undefined}
        />
      </div>
      {showValidationError ? (
        <p id="screenplay-validation-error" className={styles.fieldError} role="alert">
          {validationError}
        </p>
      ) : saveError ? (
        <p className={styles.fieldError} role="alert">
          {saveError}
        </p>
      ) : (
        <p className={styles.fieldHint}>
          At least {MIN_SCREENPLAY_LENGTH} characters ({value.trim().length}/{MIN_SCREENPLAY_LENGTH})
        </p>
      )}
      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        eyebrow="Step 3 of 6"
        title="Screenplay"
        subtitle="Review the screenplay before breaking it into scenes."
      >
        <textarea
          className={readerStyles.textareaBlock}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Screenplay content"
        />
      </CreationFullscreenReader>
    </div>
  )
}
