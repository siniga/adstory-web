import styles from './FocusModeControls.module.css'

export default function FocusModeControls({
  showRightPanel,
  onToggleRightPanel,
  onExit,
  onBackToStory,
}) {
  return (
    <div className={styles.controls} role="toolbar" aria-label="Focus mode controls">
      {onBackToStory ? (
        <button type="button" className={styles.backBtn} onClick={onBackToStory} title="Back to project">
          ← Story
        </button>
      ) : null}
      <button type="button" className={styles.exitBtn} onClick={onExit}>
        Exit Fullscreen
      </button>
      <button
        type="button"
        className={`${styles.inspectorBtn} ${showRightPanel ? styles.inspectorBtnActive : ''}`}
        onClick={onToggleRightPanel}
        aria-pressed={showRightPanel}
      >
        {showRightPanel ? 'Hide Inspector' : 'Inspector'}
      </button>
    </div>
  )
}
