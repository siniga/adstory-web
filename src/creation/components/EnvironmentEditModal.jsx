import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './CharacterModal.module.css'

const EMPTY_FORM = {
  name: '',
  type: '',
  description: '',
  location: '',
  time_of_day: '',
  weather: '',
  mood: '',
  lighting: '',
  notes: '',
}

function environmentToForm(environment) {
  if (!environment) return EMPTY_FORM

  return {
    name: environment.name ?? '',
    type: environment.type ?? '',
    description: environment.description ?? '',
    location: environment.location ?? '',
    time_of_day: environment.timeOfDay ?? '',
    weather: environment.weather ?? '',
    mood: environment.mood ?? '',
    lighting: environment.lightingStyle ?? '',
    notes: environment.notes ?? '',
  }
}

export default function EnvironmentEditModal({
  open,
  environment,
  onClose,
  onSave,
  saving = false,
  error = null,
}) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm(environmentToForm(environment))
    }
  }, [open, environment])

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

  if (!open || !environment) return null

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(form)
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={saving ? undefined : onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-environment-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="edit-environment-title" className={styles.title}>
            Edit Environment
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              className={styles.input}
              value={form.name}
              onChange={(event) => updateField('name', event.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Type</span>
            <input
              className={styles.input}
              value={form.type}
              onChange={(event) => updateField('type', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(event) => updateField('description', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Location</span>
            <input
              className={styles.input}
              value={form.location}
              onChange={(event) => updateField('location', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Time of day</span>
            <input
              className={styles.input}
              value={form.time_of_day}
              onChange={(event) => updateField('time_of_day', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Weather</span>
            <input
              className={styles.input}
              value={form.weather}
              onChange={(event) => updateField('weather', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Mood</span>
            <input
              className={styles.input}
              value={form.mood}
              onChange={(event) => updateField('mood', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Lighting</span>
            <input
              className={styles.input}
              value={form.lighting}
              onChange={(event) => updateField('lighting', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Notes</span>
            <textarea
              className={styles.textarea}
              value={form.notes}
              onChange={(event) => updateField('notes', event.target.value)}
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
        </form>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
