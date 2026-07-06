import { IconExpand } from '../../studio/icons'
import { CREATION_STEP_COUNT } from '../creationData'
import styles from './StepLayout.module.css'

export default function StepHeader({
  stepId,
  stepNumber,
  title,
  subtitle,
  question,
  onFullscreen,
}) {
  const eyebrow =
    stepNumber != null
      ? `Step ${stepNumber} of ${CREATION_STEP_COUNT}`
      : stepId
        ? `Step · ${title}`
        : null

  return (
    <header className={styles.header}>
      <div className={styles.headerMain}>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1 className={styles.title}>{title}</h1>
        {question ? <p className={styles.question}>{question}</p> : null}
        {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
      </div>
      {onFullscreen ? (
        <button
          type="button"
          className={styles.fullscreenBtn}
          onClick={onFullscreen}
          aria-label="Open fullscreen reader"
          title="Fullscreen"
        >
          <IconExpand />
          <span>Fullscreen</span>
        </button>
      ) : null}
    </header>
  )
}
