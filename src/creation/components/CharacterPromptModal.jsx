import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconClose } from '../../studio/icons'
import styles from './CharacterModal.module.css'

const EXAMPLE_PROMPT = 'Make this character older and give him a white beard.'

export default function CharacterPromptModal({
  open,
  character,
  onClose,
  onSubmit,
  submitting = false,
  error = null,
}) {
  const [prompt, setPrompt] = useState('')

  useEffect(() => {
    if (open) {
      setPrompt('')
    }
  }, [open, character?.id])

  useEffect(() => {
    if (!open) return undefined

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open || !character) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!prompt.trim()) return
    onSubmit(prompt.trim())
  }

  return createPortal(
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Modify ${character.name} with prompt`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>Modify with Prompt</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </header>

        <form className={styles.body} onSubmit={handleSubmit}>
          <p className={styles.hint}>
            Describe how you want to change <strong>{character.name}</strong>.
          </p>
          <label className={styles.field}>
            <span className={styles.label}>Prompt</span>
            <textarea
              className={styles.textarea}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={EXAMPLE_PROMPT}
              required
            />
          </label>
          {error ? <p className={styles.error}>{error}</p> : null}
        </form>

        <footer className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className={styles.saveBtn}
            onClick={handleSubmit}
            disabled={submitting || !prompt.trim()}
          >
            {submitting ? 'Applying…' : 'Apply Prompt'}
          </button>
        </footer>
      </div>
    </div>,
    document.body
  )
}
