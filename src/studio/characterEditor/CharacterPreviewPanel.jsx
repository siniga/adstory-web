import styles from './CharacterPreviewPanel.module.css'

export default function CharacterPreviewPanel({ character, editorState }) {
  const beforeStyle = { background: character.imageGradient }
  const afterStyle = {
    background: `linear-gradient(160deg, ${editorState.skinTone || '#c68642'} 0%, #1a1a1a 45%, #7c3aed 100%)`,
  }

  return (
    <aside className={styles.panel} aria-label="Character preview">
      <h3 className={styles.title}>Live Preview</h3>
      <div className={styles.compare}>
        <div className={styles.frame}>
          <span className={styles.frameLabel}>Before</span>
          <div className={styles.placeholder} style={beforeStyle}>
            <span className={styles.placeholderBadge}>Original</span>
          </div>
        </div>
        <div className={styles.frame}>
          <span className={styles.frameLabel}>After</span>
          <div className={styles.placeholder} style={afterStyle}>
            <span className={styles.placeholderBadge}>Edited</span>
          </div>
        </div>
      </div>
      <dl className={styles.summary}>
        <div className={styles.summaryRow}>
          <dt>Pose</dt>
          <dd>{editorState.pose}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Expression</dt>
          <dd>{editorState.expression}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Outfit</dt>
          <dd>{editorState.shirt}</dd>
        </div>
      </dl>
      <p className={styles.note}>Placeholder preview — visual catalog only.</p>
    </aside>
  )
}
