import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import modalStyles from '../CharacterModal.module.css'

const EMPTY_FORM = {
  title: '',
  description: '',
  location: '',
  time_of_day: '',
  mood: '',
  visual_style: '',
  environment: '',
}

function sceneToForm(scene) {
  if (!scene) return EMPTY_FORM

  return {
    title: scene.title ?? '',
    description: scene.description ?? '',
    location: scene.location ?? '',
    time_of_day: scene.time_of_day ?? '',
    mood: scene.mood ?? '',
    visual_style: scene.visual_style ?? '',
    environment: scene.environment ?? '',
  }
}

function addPositionLabel(position) {
  if (position === 'before') return 'Add Sequence Before'
  if (position === 'after') return 'Add Sequence After'
  return 'Add Sequence'
}

export default function SceneEditModal({
  open,
  mode = 'edit',
  scene = null,
  addPosition = 'end',
  saving = false,
  error = null,
  onClose,
  onSave,
}) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm(mode === 'edit' ? sceneToForm(scene) : EMPTY_FORM)
    }
  }, [open, mode, scene])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, saving])

  if (!open) return null

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(form)
  }

  const title =
    mode === 'edit'
      ? `Edit Sequence ${scene?.scene_number ?? ''}`.trim()
      : addPositionLabel(addPosition)

  return createPortal(
    <div className={modalStyles.overlay} role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className={modalStyles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="scene-edit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={modalStyles.header}>
          <h2 id="scene-edit-title" className={modalStyles.title}>
            {title}
          </h2>
          <button
            type="button"
            className={modalStyles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form className={modalStyles.body} onSubmit={handleSubmit}>
          <label className={modalStyles.field}>
            <span className={modalStyles.label}>Title</span>
            <input
              className={modalStyles.input}
              value={form.title}
              onChange={(event) => updateField('title', event.target.value)}
              required
            />
          </label>
          <label className={modalStyles.field}>
            <span className={modalStyles.label}>Description</span>
            <textarea
              className={modalStyles.textarea}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
              rows={4}
            />
          </label>
          <label className={modalStyles.field}>
            <span className={modalStyles.label}>Location</span>
            <input
              className={modalStyles.input}
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
            />
          </label>
          <label className={modalStyles.field}>
            <span className={modalStyles.label}>Time of day</span>
            <input
              className={modalStyles.input}
              value={form.time_of_day}
              onChange={(event) => updateField('time_of_day', event.target.value)}
            />
          </label>
          <label className={modalStyles.field}>
            <span className={modalStyles.label}>Mood</span>
            <input
              className={modalStyles.input}
              value={form.mood}
              onChange={(event) => updateField('mood', event.target.value)}
            />
          </label>
          <label className={modalStyles.field}>
            <span className={modalStyles.label}>Visual style</span>
            <input
              className={modalStyles.input}
              value={form.visual_style}
              onChange={(event) => updateField('visual_style', event.target.value)}
            />
          </label>
          {mode === 'edit' ? (
            <label className={modalStyles.field}>
              <span className={modalStyles.label}>Environment</span>
              <input
                className={modalStyles.input}
                value={form.environment}
                onChange={(event) => updateField('environment', event.target.value)}
              />
            </label>
          ) : null}
          {error ? <p className={modalStyles.error}>{error}</p> : null}
        </form>

        <footer className={modalStyles.footer}>
          <button type="button" className={modalStyles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={modalStyles.saveBtn}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Add Sequence'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
