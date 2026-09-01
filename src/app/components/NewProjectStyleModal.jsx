import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  DEFAULT_VISUAL_STYLE,
  VISUAL_STYLES,
  normalizeVisualStyle,
} from '../../config/visualStyles'
import {
  MIN_SCREENPLAY_LENGTH,
  MIN_STORY_LENGTH,
  validateScreenplay,
  validateStory,
} from '../../services/adstoryApi'
import { estimateEpisodeCount, storyNeedsEpisodes } from '../../services/storyLength'
import styles from './NewProjectStyleModal.module.css'

const STEPS = [
  { id: 1, label: 'Name' },
  { id: 2, label: 'Style' },
  { id: 3, label: 'Start' },
  { id: 4, label: 'Content' },
]

const LAST_STEP = STEPS.length

const START_OPTIONS = [
  {
    id: 'story',
    title: 'Story',
    description: 'I have an idea. Convert it into a screenplay, then sequences.',
  },
  {
    id: 'screenplay',
    title: 'Screenplay',
    description: 'I have a formatted screenplay. Extract visual sequences from it.',
  },
  {
    id: 'scenes',
    title: 'Sequences',
    description: 'I already know the sequences. Start on the sequence board.',
  },
]

export const START_STEP = {
  story: 'story',
  screenplay: 'screenplay',
  scenes: 'sceneboard',
}

function emptyScene() {
  return { title: '', description: '' }
}

function createInitialForm() {
  return {
    title: '',
    visualStyle: DEFAULT_VISUAL_STYLE,
    startWith: 'story',
    story: '',
    screenplay: '',
    scenes: [emptyScene()],
  }
}

function hasNamedScene(scenes) {
  return scenes.some((scene) => scene.title.trim() || scene.description.trim())
}

function CharacterMinimum({ length, min }) {
  const unmet = length < min
  return (
    <span
      className={unmet ? styles.charCountWarn : styles.charCount}
      aria-live="polite"
    >
      {length}/{min} characters minimum
    </span>
  )
}

function PasteField({ label, value, min, placeholder, creating, onChange }) {
  const length = value.trim().length
  return (
    <label className={styles.pasteField}>
      <span className={styles.fieldHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <span aria-hidden="true">
          <CharacterMinimum length={length} min={min} />
        </span>
      </span>
      <textarea
        className={styles.textarea}
        value={value}
        rows={8}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        disabled={creating}
      />
      <CharacterMinimum length={length} min={min} />
    </label>
  )
}

function MaterialFields({ form, creating, onUpdate }) {
  if (form.startWith === 'story') {
    const tooLong = storyNeedsEpisodes(form.story)
    const episodes = estimateEpisodeCount(form.story)
    return (
      <>
        <PasteField
          label="Paste your story"
          value={form.story}
          min={MIN_STORY_LENGTH}
          placeholder="What happens, who it is about, and why it matters."
          creating={creating}
          onChange={(story) => onUpdate({ story })}
        />
        {tooLong ? (
          <p className={styles.fieldHint}>
            This story is too long for a single screenplay. After you create the project, we will
            ask to divide it into {episodes} episodes.
          </p>
        ) : null}
      </>
    )
  }

  if (form.startWith === 'screenplay') {
    return (
      <PasteField
        label="Paste your screenplay"
        value={form.screenplay}
        min={MIN_SCREENPLAY_LENGTH}
        placeholder="INT. LOCATION - DAY&#10;&#10;Character names, dialogue, and scene headings."
        creating={creating}
        onChange={(screenplay) => onUpdate({ screenplay })}
      />
    )
  }

  return (
    <div className={styles.sceneList}>
      <div className={styles.fieldHeader}>
        <p className={styles.fieldLabel}>Add your sequences</p>
        <span className={hasNamedScene(form.scenes) ? styles.charCount : styles.charCountWarn}>
          At least one sequence with a title or description
        </span>
      </div>
      {form.scenes.map((scene, index) => (
        <div key={`scene-${index}`} className={styles.sceneRow}>
          <div className={styles.sceneRowHeader}>
            <span className={styles.sceneIndex}>Sequence {index + 1}</span>
            {form.scenes.length > 1 ? (
              <button
                type="button"
                className={styles.sceneRemove}
                onClick={() =>
                  onUpdate({
                    scenes: form.scenes.filter((_, sceneIndex) => sceneIndex !== index),
                  })
                }
                disabled={creating}
              >
                Remove
              </button>
            ) : null}
          </div>
          <input
            className={styles.input}
            type="text"
            value={scene.title}
            placeholder="Sequence title"
            onChange={(event) => {
              const next = [...form.scenes]
              next[index] = { ...scene, title: event.target.value }
              onUpdate({ scenes: next })
            }}
            disabled={creating}
          />
          <textarea
            className={styles.textareaCompact}
            value={scene.description}
            rows={3}
            placeholder="What happens in this sequence."
            onChange={(event) => {
              const next = [...form.scenes]
              next[index] = { ...scene, description: event.target.value }
              onUpdate({ scenes: next })
            }}
            disabled={creating}
          />
        </div>
      ))}
      <button
        type="button"
        className={styles.addSceneBtn}
        onClick={() => onUpdate({ scenes: [...form.scenes, emptyScene()] })}
        disabled={creating}
      >
        Add sequence
      </button>
    </div>
  )
}

export default function NewProjectStyleModal({
  open,
  creating = false,
  onCancel,
  onConfirm,
}) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(createInitialForm)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    setStep(1)
    setForm(createInitialForm())
    setTouched(false)

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !creating) {
        onCancel()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, creating, onCancel])

  const materialError = useMemo(() => {
    if (form.startWith === 'story') return validateStory(form.story)
    if (form.startWith === 'screenplay') return validateScreenplay(form.screenplay)
    if (form.startWith === 'scenes' && !hasNamedScene(form.scenes)) {
      return 'Add at least one sequence with a title or description.'
    }
    return null
  }, [form])

  if (!open) return null

  const update = (patch) => setForm((current) => ({ ...current, ...patch }))
  const selectedStart =
    START_OPTIONS.find((option) => option.id === form.startWith) ?? START_OPTIONS[0]

  const canContinue =
    step === 1
      ? Boolean(form.title.trim())
      : step === 2
        ? Boolean(form.visualStyle)
        : step === 3
          ? Boolean(form.startWith)
          : !materialError

  const handlePrimary = () => {
    if (creating) return
    if (step < LAST_STEP) {
      if (!canContinue) {
        setTouched(true)
        return
      }
      setTouched(false)
      setStep((current) => current + 1)
      return
    }

    setTouched(true)
    if (materialError) return

    onConfirm({
      title: form.title.trim(),
      visualStyle: normalizeVisualStyle(form.visualStyle),
      startWith: form.startWith,
      story: form.story.trim(),
      screenplay: form.screenplay.trim(),
      scenes: form.scenes
        .filter((scene) => scene.title.trim() || scene.description.trim())
        .map((scene, index) => ({
          scene_number: index + 1,
          title: scene.title.trim() || `Sequence ${index + 1}`,
          description: scene.description.trim(),
        })),
    })
  }

  const titles = {
    1: {
      heading: 'Name the project',
      subtitle: 'Give this project a title you can find again later.',
    },
    2: {
      heading: 'Choose a visual style',
      subtitle: 'Pick how storyboard images should look for this project.',
    },
    3: {
      heading: 'Where do you start?',
      subtitle: 'Select the material you already have, then continue to add it.',
    },
    4: {
      heading: `Add your ${selectedStart.title.toLowerCase()}`,
      subtitle: 'Paste what you have. Switch type here if you change your mind.',
    },
  }

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={creating ? undefined : onCancel}
    >
      <div
        className={`${styles.panel} ${step >= 2 ? styles.panelWide : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        aria-describedby="new-project-desc"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <p className={styles.eyebrow}>New project</p>
          <h2 id="new-project-title" className={styles.title}>
            {titles[step].heading}
          </h2>
          <p id="new-project-desc" className={styles.subtitle}>
            {titles[step].subtitle}
          </p>
          <ol className={styles.stepBar} aria-label="Create project steps">
            {STEPS.map((item) => (
              <li
                key={item.id}
                className={`${styles.stepItem} ${step === item.id ? styles.stepItemActive : ''} ${
                  step > item.id ? styles.stepItemDone : ''
                }`}
              >
                <span className={styles.stepDot}>{item.id}</span>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>
        </header>

        <div className={`${styles.body} ${step === 4 ? styles.bodyPinned : ''}`}>
          {step === 1 ? (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Project name</span>
              <input
                className={styles.input}
                type="text"
                value={form.title}
                maxLength={150}
                autoFocus
                placeholder="Harbor Lights"
                onChange={(event) => update({ title: event.target.value })}
                disabled={creating}
              />
              {touched && !form.title.trim() ? (
                <span className={styles.fieldError}>Enter a project name.</span>
              ) : null}
            </label>
          ) : null}

          {step === 2 ? (
            <div className={styles.styleGrid} role="listbox" aria-label="Visual style">
              {VISUAL_STYLES.map((style) => {
                const selected = form.visualStyle === style.value
                return (
                  <button
                    key={style.value}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`${styles.styleCard} ${selected ? styles.styleCardSelected : ''}`}
                    onClick={() => update({ visualStyle: style.value })}
                    disabled={creating}
                  >
                    <span
                      className={styles.styleSwatch}
                      style={{ background: style.gradient }}
                      aria-hidden="true"
                    />
                    <span className={styles.styleLabel}>{style.label}</span>
                  </button>
                )
              })}
            </div>
          ) : null}

          {step === 3 ? (
            <div className={styles.startStep}>
              <div className={styles.startGrid} role="listbox" aria-label="Starting material">
                {START_OPTIONS.map((option) => {
                  const selected = form.startWith === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`${styles.startCard} ${selected ? styles.startCardSelected : ''}`}
                      onClick={() => {
                        update({ startWith: option.id })
                        setTouched(false)
                      }}
                      disabled={creating}
                    >
                      <span className={styles.startCardTitle}>{option.title}</span>
                      <span className={styles.startCardDesc}>{option.description}</span>
                    </button>
                  )
                })}
              </div>
              {touched && !form.startWith ? (
                <p className={styles.fieldError}>Select a starting material.</p>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div className={styles.startStep}>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Starting material</span>
                <select
                  className={styles.select}
                  value={form.startWith}
                  onChange={(event) => {
                    update({ startWith: event.target.value })
                    setTouched(false)
                  }}
                  disabled={creating}
                  aria-label="Starting material"
                >
                  {START_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.title}
                    </option>
                  ))}
                </select>
                <span className={styles.fieldHint}>{selectedStart.description}</span>
              </label>

              <MaterialFields form={form} creating={creating} onUpdate={update} />

              {touched && materialError ? <p className={styles.fieldError}>{materialError}</p> : null}
            </div>
          ) : null}
        </div>

        <footer className={styles.footer}>
          {step === 1 ? (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onCancel}
              disabled={creating}
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={() => {
                setTouched(false)
                setStep((current) => current - 1)
              }}
              disabled={creating}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className={styles.continueBtn}
            onClick={handlePrimary}
            disabled={creating || !canContinue}
          >
            {creating ? 'Creating…' : step === LAST_STEP ? 'Create project' : 'Continue'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
