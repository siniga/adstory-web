import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import styles from './CharacterModal.module.css'

const EMPTY_FORM = {
  name: '',
  category: '',
  description: '',
  material: '',
  color: '',
  condition: '',
  notes: '',
}

function objectToForm(object) {
  if (!object) return EMPTY_FORM

  return {
    name: object.name ?? '',
    category: object.category ?? '',
    description: object.description ?? '',
    material: object.material ?? '',
    color: object.color ?? object.primaryColor ?? '',
    condition: object.condition ?? '',
    notes: object.notes ?? '',
  }
}

export default function ObjectEditModal({
  open,
  object,
  onClose,
  onSave,
  saving = false,
  error = null,
}) {
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      setForm(objectToForm(object))
    }
  }, [open, object])

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

  if (!open || !object) return null

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
        aria-labelledby="edit-object-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="edit-object-title" className={styles.title}>
            Edit Object
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
            <span className={styles.label}>Category</span>
            <input
              className={styles.input}
              value={form.category}
              onChange={(event) => updateField('category', event.target.value)}
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
            <span className={styles.label}>Material</span>
            <input
              className={styles.input}
              value={form.material}
              onChange={(event) => updateField('material', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Color</span>
            <input
              className={styles.input}
              value={form.color}
              onChange={(event) => updateField('color', event.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Condition</span>
            <input
              className={styles.input}
              value={form.condition}
              onChange={(event) => updateField('condition', event.target.value)}
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
