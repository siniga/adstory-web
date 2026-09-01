import { IconExpand } from '../../studio/icons'
import styles from './WritingPage.module.css'

export function countWords(text = '') {
  const parts = text.trim().split(/\s+/).filter(Boolean)
  return parts.length
}

export default function WritingPageShell({
  variant = 'story',
  kicker,
  title,
  lead,
  chip,
  onFullscreen,
  saveLabel,
  onSave,
  saveDisabled = false,
  loading = false,
  generating = false,
  generatingLabel,
  error,
  savedLabel,
  wordCount = 0,
  charCount = 0,
  minChars = 0,
  textareaId,
  children,
}) {
  const minMet = minChars <= 0 || charCount >= minChars

  return (
    <div className={`${styles.page} ${styles[variant]}`}>
      <header className={styles.top}>
        <div className={styles.topMain}>
          {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
          <h1 className={styles.title}>{title}</h1>
          {lead ? <p className={styles.lead}>{lead}</p> : null}
        </div>
        <div className={styles.actions}>
          {chip ? (
            <span className={styles.chip}>
              Style <strong>{chip}</strong>
            </span>
          ) : null}
          {onSave ? (
            <button
              type="button"
              className={styles.saveBtn}
              onClick={onSave}
              disabled={saveDisabled}
            >
              {saveLabel}
            </button>
          ) : null}
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
        </div>
      </header>

      {loading ? (
        <p className={styles.statusBanner} role="status">
          Loading {title.toLowerCase()}…
        </p>
      ) : null}
      {generating && generatingLabel ? (
        <p className={styles.statusBanner} role="status">
          {generatingLabel}
        </p>
      ) : null}

      <div className={styles.stage}>
        <div className={styles.sheet}>{children}</div>
      </div>

      <footer className={styles.meta}>
        <div className={styles.metaStats}>
          <span>
            {wordCount.toLocaleString()} {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span className={styles.dot} aria-hidden="true" />
          <span>
            {charCount.toLocaleString()} characters
            {minChars > 0 ? ` · ${minChars} min` : ''}
          </span>
          {minChars > 0 ? (
            minMet ? (
              <span className={styles.ready}>Ready</span>
            ) : (
              <span className={styles.needMore}>Keep writing</span>
            )
          ) : null}
        </div>
        {error ? (
          <p id={`${textareaId}-error`} className={`${styles.metaMessage} ${styles.error}`} role="alert">
            {error}
          </p>
        ) : savedLabel ? (
          <p className={`${styles.metaMessage} ${styles.saved}`} role="status">
            {savedLabel}
          </p>
        ) : null}
      </footer>
    </div>
  )
}
