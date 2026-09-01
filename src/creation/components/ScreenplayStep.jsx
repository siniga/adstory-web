import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWorkspaceQuestion } from '../creationData'
import { MIN_SCREENPLAY_LENGTH, validateScreenplay } from '../../services/adstoryApi'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import WritingPageShell, { countWords } from './WritingPageShell'
import writeStyles from './WritingPage.module.css'

export default function ScreenplayStep({
  screenplay,
  onActionChange,
  onBackToStory,
  onSave,
  onNext,
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
      label: 'Continue to sequences',
      generatingLabel: generating ? 'Breaking your screenplay into sequences…' : 'Continue to sequences',
      disabled: Boolean(validationError) || generating || isSaving,
      onClick: () => {
        setTouched(true)
        if (validationError) {
          return
        }
        onNext?.({ screenplay: value.trim() })
      },
      secondaryAction: {
        label: 'Back to Story',
        onClick: () => onBackToStory(value.trim()),
        disabled: generating || isSaving,
      },
    })

    return () => onActionChange(null)
  }, [generating, isSaving, onActionChange, onBackToStory, onNext, validationError, value])

  return (
    <>
      <WritingPageShell
        variant="screenplay"
        kicker="Production draft"
        title="Screenplay"
        lead={getWorkspaceQuestion('screenplay')}
        onFullscreen={() => setFullscreenOpen(true)}
        onSave={handleSave}
        saveLabel={isSaving ? 'Saving…' : 'Save'}
        saveDisabled={generating || isSaving || Boolean(validationError)}
        loading={loading}
        generating={generating}
        generatingLabel="Breaking your screenplay into sequences…"
        error={showValidationError ? validationError : saveError}
        savedLabel={saveStatusLabel}
        wordCount={countWords(value)}
        charCount={value.trim().length}
        minChars={MIN_SCREENPLAY_LENGTH}
        textareaId="screenplay"
      >
        <textarea
          id="screenplay"
          className={writeStyles.editor}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-label="Screenplay content"
          aria-invalid={showValidationError ? 'true' : undefined}
          aria-describedby={
            showValidationError || saveError ? 'screenplay-error' : undefined
          }
        />
      </WritingPageShell>

      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        variant="screenplay"
        title="Screenplay"
        subtitle="Review formatting before you break it into sequences."
      >
        <textarea
          className={`${readerStyles.editor} ${readerStyles.screenplayEditor}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Screenplay content"
        />
      </CreationFullscreenReader>
    </>
  )
}
