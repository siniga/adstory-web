import CreationFlow from '../creation/CreationFlow'
import styles from './StoryArea.module.css'

export default function StoryArea({
  projectState,
  projectStore,
  currentStep,
  maxStepIndex,
  onOpenStoryboard,
}) {
  return (
    <div className={styles.root}>
      <CreationFlow
        projectState={projectState}
        projectStore={projectStore}
        currentStep={currentStep}
        maxStepIndex={maxStepIndex}
        onOpenStoryboard={onOpenStoryboard}
      />
    </div>
  )
}
