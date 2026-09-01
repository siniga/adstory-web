import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '../../config/branding'
import { getVisualStyleLabel } from '../../config/visualStyles'
import { getWorkspaceQuestion } from '../creationData'
import { MIN_STORY_LENGTH, validateStory } from '../../services/adstoryApi'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import WritingPageShell, { countWords } from './WritingPageShell'
import writeStyles from './WritingPage.module.css'

export default function StoryStep({
  story,
  visualStyle,
  onStoryChange,
  onActionChange,
  onNext,
  generating,
  saveError,
  saveStatus = 'idle',
  loading = false,
}) {
  const [value, setValue] = useState(story)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  const validationError = useMemo(() => validateStory(value), [value])
  const showValidationError = touched && validationError
  const trimmedLength = value.trim().length
  const styleLabel = getVisualStyleLabel(visualStyle)
  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null

  useEffect(() => {
    setValue(story)
  }, [story])

  useEffect(() => {
    if (!onActionChange) {
      return undefined
    }

    onActionChange({
      label: 'Generate',
      generatingLabel: generating ? 'Generating your project…' : 'Generate',
      disabled: Boolean(validationError) || generating,
      onClick: () => {
        setTouched(true)
        if (validationError) {
          return
        }

        const trimmedStory = value.trim()
        onStoryChange(trimmedStory)
        onNext({
          story: trimmedStory,
          name: trimmedStory.split(/[.!?]/)[0]?.trim().slice(0, 48) || BRAND.untitledProjectName,
        })
      },
    })

    return () => onActionChange(null)
  }, [generating, onActionChange, onNext, onStoryChange, validationError, value])

  return (
    <>
      <WritingPageShell
        variant="story"
        kicker="Manuscript"
        title="Story"
        lead={getWorkspaceQuestion('story')}
        chip={styleLabel}
        onFullscreen={() => setFullscreenOpen(true)}
        loading={loading}
        error={showValidationError ? validationError : saveError}
        savedLabel={saveStatusLabel}
        wordCount={countWords(value)}
        charCount={trimmedLength}
        minChars={MIN_STORY_LENGTH}
        textareaId="story"
      >
        <textarea
          id="story"
          className={writeStyles.editor}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Write the story you want to see on screen…"
          aria-label="Story idea"
          aria-invalid={showValidationError ? 'true' : undefined}
          aria-describedby={
            showValidationError || saveError ? 'story-error' : undefined
          }
        />
      </WritingPageShell>

      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        variant="story"
        title="Story"
        subtitle={getWorkspaceQuestion('story')}
      >
        <textarea
          className={`${readerStyles.editor} ${readerStyles.storyEditor}`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write the story you want to see on screen…"
          aria-label="Story idea"
        />
      </CreationFullscreenReader>
    </>
  )
}
