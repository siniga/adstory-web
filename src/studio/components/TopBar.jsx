import { BRAND } from '../../config/branding'
import { getActiveProjectName } from '../activeProject'
import { PROGRESS_STEPS } from '../data'
import { IconCheck, IconChevronDown, IconFullscreen, IconHelp, IconRedo, IconUndo } from '../icons'
import styles from './TopBar.module.css'

export default function TopBar({ onEnterFocusMode, onBackToStory }) {
  const projectName = getActiveProjectName()
  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        {onBackToStory ? (
          <button
            type="button"
            className={styles.backBtn}
            onClick={onBackToStory}
            aria-label="Back to story area"
            title="Back to story area"
          >
            <span aria-hidden="true">←</span>
          </button>
        ) : null}
        <div className={styles.brand}>
          {BRAND.name}<span className={styles.brandDot}>.</span>
        </div>
        <span className={styles.divider} />
        <div className={styles.project}>
          <span className={styles.projectLabel}>{BRAND.projectLabel}</span>
          <button type="button" className={styles.projectBtn}>
            <span>{projectName}</span>
            <IconChevronDown />
          </button>
        </div>
      </div>

      <nav className={styles.steps} aria-label="Project progress">
        {PROGRESS_STEPS.map((step, index) => (
          <div key={step.id} className={styles.stepGroup}>
            {index > 0 && <span className={styles.stepConnector} />}
            {step.status === 'done' ? (
              <div className={styles.stepDone}>
                <span className={styles.stepCircleDone}>
                  <IconCheck />
                </span>
                <span className={styles.stepLabel}>{step.label}</span>
              </div>
            ) : (
              <div className={styles.stepActive}>
                <span className={styles.stepCircleActive}>{step.stepNumber}</span>
                <span className={styles.stepLabelActive}>{step.label}</span>
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.right}>
        <button type="button" className={styles.iconBtn} aria-label="Undo">
          <IconUndo />
        </button>
        <button type="button" className={styles.iconBtn} aria-label="Redo">
          <IconRedo />
        </button>
        <button type="button" className={styles.helpBtn} aria-label="Help">
          <IconHelp />
        </button>
        <button
          type="button"
          className={styles.fullscreenBtn}
          onClick={onEnterFocusMode}
          aria-label="Enter focus mode"
          title="Focus mode (F)"
        >
          <IconFullscreen />
          <span>Fullscreen</span>
        </button>
        <button type="button" className={styles.exportBtn}>
          <span>Export</span>
          <IconChevronDown />
        </button>
      </div>
    </header>
  )
}
