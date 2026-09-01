import styles from './ModeSwitcher.module.css'

export default function ModeSwitcher({
  activeMode,
  onModeChange,
  storyboardEnabled = true,
  compact = false,
}) {
  return (
    <div
      className={`${styles.bar} ${compact ? styles.barCompact : ''}`}
      role="navigation"
      aria-label="App mode"
    >
      <div className={styles.switcher} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'story'}
          className={`${styles.tab} ${activeMode === 'story' ? styles.tabActive : ''}`}
          onClick={() => onModeChange('story')}
        >
          Story Area
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeMode === 'storyboard'}
          className={`${styles.tab} ${activeMode === 'storyboard' ? styles.tabActive : ''}`}
          onClick={() => (storyboardEnabled ? onModeChange('storyboard') : undefined)}
          disabled={!storyboardEnabled}
          title={storyboardEnabled ? 'Storyboard' : 'Complete assets first'}
        >
          Storyboard
        </button>
      </div>
    </div>
  )
}
