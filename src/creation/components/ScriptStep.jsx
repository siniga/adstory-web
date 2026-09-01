import { useCallback, useEffect, useMemo, useState } from 'react'
import { getWorkspaceQuestion } from '../creationData'
import { MIN_SCRIPT_LENGTH, validateScript } from '../../services/adstoryApi'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import WritingPageShell, { countWords } from './WritingPageShell'
import writeStyles from './WritingPage.module.css'

export default function ScriptStep({
  script,
  onActionChange,
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
    onActionChange?.(null)
    return () => onActionChange?.(null)
  }, [onActionChange])

  return (
    <>
      <WritingPageShell
        variant="script"
        kicker="Dialogue draft"
        title="Script"
        lead={getWorkspaceQuestion('script')}
        onFullscreen={() => setFullscreenOpen(true)}
        onSave={handleSave}
        saveLabel={isSaving ? 'Saving…' : 'Save'}
        saveDisabled={generating || isSaving || Boolean(validationError)}
        loading={loading}
        generating={generating}
        generatingLabel="Formatting your script into a screenplay…"
        error={showValidationError ? validationError : saveError}
        savedLabel={saveStatusLabel}
        wordCount={countWords(value)}
        charCount={value.trim().length}
        minChars={MIN_SCRIPT_LENGTH}
        textareaId="script"
      >
        <textarea
          id="script"
          className={writeStyles.editor}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-label="Script content"
          aria-invalid={showValidationError ? 'true' : undefined}
          aria-describedby={
            showValidationError || saveError ? 'script-error' : undefined
          }
        />
      </WritingPageShell>

      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        variant="script"
        title="Script"
        subtitle="Read it aloud. Adjust dialogue, action, and pacing."
      >
        <textarea
          className={`${readerStyles.editor} ${readerStyles.scriptEditor}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          aria-label="Script content"
        />
      </CreationFullscreenReader>
    </>
  )
}
