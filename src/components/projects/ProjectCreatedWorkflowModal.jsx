import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ProjectCreatedWorkflowModal.module.css'

const WORKFLOW_STEPS = [
  {
    id: 'story',
    number: 1,
    title: 'Story',
    description: 'Write your story idea',
    current: true,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v13.5L12.5 17 7 20.5V7A2.5 2.5 0 0 1 9.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9.5 8.5h5" strokeLinecap="round" />
        <path d="M9.5 11.5h3.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'screenplay',
    number: 2,
    title: 'Screenplay',
    description: 'AI turns your story into a professional screenplay',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'storyboard',
    number: 3,
    title: 'Storyboard',
    description: 'Scenes are broken down into frames, shots, and cinematography suggestions',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3.5" y="6" width="7" height="5.5" rx="1" />
        <rect x="13.5" y="6" width="7" height="5.5" rx="1" />
        <rect x="3.5" y="13.5" width="7" height="5.5" rx="1" />
        <rect x="13.5" y="13.5" width="7" height="5.5" rx="1" />
      </svg>
    ),
  },
  {
    id: 'characters',
    number: 4,
    title: 'Characters',
    description: 'Generate all characters extracted from your screenplay',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19c1.2-3.2 3.4-4.8 6.5-4.8S17.3 15.8 18.5 19" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'environments',
    number: 5,
    title: 'Environments',
    description: 'Generate the environments required for your scenes',
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 18.5h16" strokeLinecap="round" />
        <path d="M6 18.5V10l4-4 4 3.5 4-2.5v11" strokeLinejoin="round" />
        <path d="M10 18.5v-4h3v4" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function ProjectCreatedWorkflowModal({
  open,
  project,
  onClose,
  onStart,
}) {
  useEffect(() => {
    if (!open) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  const projectTitle = project?.title?.trim() || project?.name?.trim() || null

  return createPortal(
    <div
      className={styles.overlay}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-created-title"
        aria-describedby="project-created-subtitle"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>

        <div className={styles.hero}>
          <div className={styles.successIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12.5l4.2 4.2L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 id="project-created-title" className={styles.title}>
            Project Created!
          </h2>
          <p id="project-created-subtitle" className={styles.subtitle}>
            Let&apos;s bring your story to life.
          </p>
          {projectTitle ? (
            <p className={styles.projectName}>{projectTitle}</p>
          ) : null}
        </div>

        <ol className={styles.timeline} aria-label="Project workflow">
          {WORKFLOW_STEPS.map((step, index) => (
            <li
              key={step.id}
              className={`${styles.step} ${step.current ? styles.stepCurrent : ''}`}
            >
              <div className={styles.rail} aria-hidden="true">
                <span className={styles.stepIconWrap}>{step.icon}</span>
                {index < WORKFLOW_STEPS.length - 1 ? (
                  <span className={styles.connector} />
                ) : null}
              </div>

              <div className={styles.stepBody}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepNumber}>Step {step.number}</span>
                  {step.current ? <span className={styles.currentBadge}>Current</span> : null}
                </div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDescription}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.footer}>
          <button type="button" className={styles.startBtn} onClick={onStart}>
            Start with Story →
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
