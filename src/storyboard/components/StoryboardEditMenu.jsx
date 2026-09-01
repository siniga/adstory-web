import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectStepPath } from '../../routes/paths'
import styles from '../ProjectStoryboard.module.css'

const EDIT_ITEMS = [
  { id: 'story', label: 'Story', stepId: 'story' },
  { id: 'screenplay', label: 'Screenplay', stepId: 'screenplay' },
  { id: 'scenes', label: 'Scenes', stepId: 'sceneboard' },
  { id: 'characters', label: 'Characters', stepId: 'characters' },
  { id: 'environments', label: 'Environments', stepId: 'environments' },
]

export default function StoryboardEditMenu({ projectId }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handlePointer = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSelect = (item) => {
    if (!projectId) return
    setOpen(false)
    navigate(projectStepPath(projectId, item.stepId), {
      state: { stepUnlock: item.stepId },
    })
  }

  return (
    <div className={styles.editMenu} ref={rootRef}>
      <button
        type="button"
        className={`${styles.editMenuBtn} ${open ? styles.editMenuBtnOpen : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        Edit
        <span className={styles.editMenuCaret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className={styles.editMenuDropdown} role="menu" aria-label="Edit project items">
          {EDIT_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={styles.editMenuItem}
              onClick={() => handleSelect(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
