import { CREATION_STEPS, getStepIndex } from '../creationData'
import { BRAND } from '../../config/branding'
import { IconCheck } from '../../studio/icons'
import styles from './CreationTopBar.module.css'

export default function CreationTopBar({ currentStep, maxStepIndex, onStepClick, projectName }) {
  const currentIndex = getStepIndex(currentStep)

  return (
    <header className={styles.bar}>
      <div className={styles.left}>
        <div className={styles.brand}>
          <span className={styles.logoMark}>{BRAND.logoMark}</span>
          <span className={styles.brandName}>{BRAND.name}</span>
        </div>
        <span className={styles.divider} />
        <span className={styles.projectName}>{projectName}</span>
      </div>

      <nav className={styles.steps} aria-label="Creation progress">
        {CREATION_STEPS.map((step, index) => {
          const isDone = index < currentIndex || (index < maxStepIndex && index !== currentIndex)
          const isActive = step.id === currentStep
          const isClickable = index <= maxStepIndex

          return (
            <div key={step.id} className={styles.stepGroup}>
              {index > 0 && <span className={styles.stepConnector} />}
              {isClickable ? (
                <button
                  type="button"
                  className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}
                  onClick={() => onStepClick(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone && !isActive && (
                    <span className={styles.stepCheck}>
                      <IconCheck />
                    </span>
                  )}
                  <span>{step.label}</span>
                  {isActive && <span className={styles.activeDot} aria-hidden="true" />}
                </button>
              ) : (
                <div
                  className={`${styles.step} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isDone && !isActive && (
                    <span className={styles.stepCheck}>
                      <IconCheck />
                    </span>
                  )}
                  <span>{step.label}</span>
                  {isActive && <span className={styles.activeDot} aria-hidden="true" />}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className={styles.right}>
        <span className={styles.stepCounter}>
          Step {Math.min(currentIndex + 1, CREATION_STEPS.length)} of {CREATION_STEPS.length}
        </span>
      </div>
    </header>
  )
}
