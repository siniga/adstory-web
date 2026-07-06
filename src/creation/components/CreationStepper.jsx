import { CREATION_STEPS, getStepIndex } from '../creationData'
import { IconCheck } from '../../studio/icons'
import styles from './CreationStepper.module.css'

export default function CreationStepper({ currentStep, maxStepIndex, onStepClick }) {
  const currentIndex = getStepIndex(currentStep)

  return (
    <nav className={styles.stepper} aria-label="Creation progress">
      <ol className={styles.list}>
        {CREATION_STEPS.map((step, index) => {
          const isDone = index < currentIndex
          const isActive = step.id === currentStep
          const isClickable = index <= maxStepIndex

          return (
            <li key={step.id} className={styles.item}>
              {isClickable ? (
                <button
                  type="button"
                  className={`${styles.stepBtn} ${isDone ? styles.stepDone : ''} ${isActive ? styles.stepActive : ''}`}
                  onClick={() => onStepClick(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                >
                  <span
                    className={`${styles.indicator} ${isDone ? styles.indicatorDone : ''} ${isActive ? styles.indicatorActive : ''}`}
                  >
                    {isDone ? <IconCheck /> : index + 1}
                  </span>
                  <span className={styles.stepLabel}>{step.label}</span>
                </button>
              ) : (
                <div className={`${styles.stepBtn} ${styles.stepLocked}`}>
                  <span className={styles.indicator}>{index + 1}</span>
                  <span className={styles.stepLabel}>{step.label}</span>
                </div>
              )}
              {index < CREATION_STEPS.length - 1 && (
                <span
                  className={`${styles.connector} ${isDone ? styles.connectorDone : ''}`}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
