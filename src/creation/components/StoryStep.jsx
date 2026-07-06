import { useEffect, useMemo, useState } from 'react'
import { BRAND } from '../../config/branding'
import { VISUAL_STYLES } from '../../config/visualStyles'
import { getWorkspaceQuestion } from '../creationData'
import { MIN_STORY_LENGTH, validateStory } from '../../services/adstoryApi'
import CreationFullscreenReader from './CreationFullscreenReader'
import readerStyles from './CreationFullscreenReader.module.css'
import StepHeader from './StepHeader'
import styles from './StepLayout.module.css'

export default function StoryStep({
  story,
  visualStyle,
  onStoryChange,
  onVisualStyleChange,
  onActionChange,
  onNext,
  generating,
  saveError,
  saveStatus = 'idle',
  loading = false,
}) {
  const [value, setValue] = useState(story)
  const [styleValue, setStyleValue] = useState(visualStyle)
  const [fullscreenOpen, setFullscreenOpen] = useState(false)
  const [touched, setTouched] = useState(false)

  const validationError = useMemo(() => validateStory(value), [value])
  const showValidationError = touched && validationError

  useEffect(() => {
    setValue(story)
  }, [story])

  useEffect(() => {
    setStyleValue(visualStyle)
  }, [visualStyle])

  useEffect(() => {
    if (!onActionChange) {
      return undefined
    }

    onActionChange({
      label: 'Generate Script',
      generatingLabel: generating ? 'Saving story and generating script…' : 'Generate Script',
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

  const handleStyleSelect = (nextStyle) => {
    setStyleValue(nextStyle)
    onVisualStyleChange(nextStyle)
  }

  const styleLabel =
    VISUAL_STYLES.find((style) => style.value === styleValue)?.label ?? styleValue

  const saveStatusLabel =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : null

  return (
    <div className={styles.step}>
      <StepHeader
        stepNumber={1}
        title="Story"
        question={getWorkspaceQuestion('story')}
        subtitle="Start with the spark. A few sentences is enough — Adstory will expand it into a full script."
        onFullscreen={() => setFullscreenOpen(true)}
      />
      {loading ? (
        <p className={styles.generationStatus} role="status">
          Loading saved story...
        </p>
      ) : null}
      {saveStatusLabel ? (
        <p className={styles.saveStatus} role="status">
          {saveStatusLabel}
        </p>
      ) : null}
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Visual Style</label>
        <p className={styles.fieldHint}>Choose how your storyboard images should look.</p>
        <div className={styles.styleTileGrid} role="listbox" aria-label="Storyboard style">
          {VISUAL_STYLES.map((style) => (
            <button
              key={style.value}
              type="button"
              role="option"
              aria-selected={styleValue === style.value}
              className={`${styles.styleTile} ${styleValue === style.value ? styles.styleTileSelected : ''}`}
              onClick={() => handleStyleSelect(style.value)}
            >
              <div
                className={styles.styleTileSwatch}
                style={{ background: style.gradient }}
                aria-hidden="true"
              />
              <span className={styles.styleTileLabel}>{style.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className={styles.readingRoom}>
        <textarea
          className={styles.textareaLarge}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="Write your story idea…"
          aria-label="Story idea"
          aria-invalid={showValidationError ? 'true' : undefined}
          aria-describedby={showValidationError ? 'story-validation-error' : undefined}
        />
      </div>
      {showValidationError ? (
        <p id="story-validation-error" className={styles.fieldError} role="alert">
          {validationError}
        </p>
      ) : saveError ? (
        <p className={styles.fieldError} role="alert">
          {saveError}
        </p>
      ) : (
        <p className={styles.fieldHint}>
          At least {MIN_STORY_LENGTH} characters ({value.trim().length}/{MIN_STORY_LENGTH})
        </p>
      )}
      <CreationFullscreenReader
        open={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        eyebrow="Step 1"
        title="Story"
        subtitle={getWorkspaceQuestion('story')}
      >
        <p className={readerStyles.metaLine}>
          Storyboard style: <strong>{styleLabel}</strong>
        </p>
        <textarea
          className={readerStyles.textareaLarge}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Write your story idea…"
          aria-label="Story idea"
        />
      </CreationFullscreenReader>
    </div>
  )
}
