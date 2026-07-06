import CreationStepper from '../../creation/components/CreationStepper'
import styles from './AssetWorkflowLayout.module.css'

export default function AssetWorkflowLayout({
  currentStep,
  maxStepIndex,
  onStepClick,
  children,
  footer,
}) {
  return (
    <div className={styles.flow}>
      <div className={styles.body}>
        <CreationStepper
          currentStep={currentStep}
          maxStepIndex={maxStepIndex}
          onStepClick={onStepClick}
        />
        <div className={styles.main}>
          <div className={styles.content}>{children}</div>
          {footer}
        </div>
      </div>
    </div>
  )
}
