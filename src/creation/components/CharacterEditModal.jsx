import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../../studio/icons'
import styles from './CharacterModal.module.css'

export default function CharacterEditModal({ open, character, onClose, onSave, saving = false, error = null }) {
  const [form, setForm] = useState({
    name: '',
    role: '',
    description: '',
    appearance: '',
    clothing: '',
    notes: '',
  })

  useEffect(() => {
    if (!open || !character) return
    setForm({
      name: character.name ?? '',
      role: character.role ?? '',
      description: character.description ?? '',
      appearance: character.appearance ?? '',
      clothing: character.clothing ?? '',
      notes: character.notes ?? '',
    })
  }, [open, character])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !character) return null

  const updateField = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(form)
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${character.name}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>Edit Character</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input className={styles.input} value={form.name} onChange={updateField('name')} required />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Role</span>
            <input className={styles.input} value={form.role} onChange={updateField('role')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Description</span>
            <textarea className={styles.textarea} value={form.description} onChange={updateField('description')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Appearance</span>
            <textarea className={styles.textarea} value={form.appearance} onChange={updateField('appearance')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Clothing</span>
            <textarea className={styles.textarea} value={form.clothing} onChange={updateField('clothing')} />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Notes</span>
            <textarea className={styles.textarea} value={form.notes} onChange={updateField('notes')} />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
        </form>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className={styles.saveBtn} onClick={handleSubmit} disabled={saving || !form.name.trim()}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
