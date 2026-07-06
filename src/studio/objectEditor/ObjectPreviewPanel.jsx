import { COLOR_PRESETS } from './objectEditorData'
import styles from './ObjectPreviewPanel.module.css'

function colorHex(colorId) {
  return COLOR_PRESETS.find((preset) => preset.id === colorId)?.color ?? '#5c4033'
}

export default function ObjectPreviewPanel({ object, editorState }) {
  const beforeStyle = { background: object.thumbnailGradient }
  const afterStyle = {
    background: `linear-gradient(145deg, ${colorHex(editorState.primaryColor)} 0%, ${colorHex(editorState.secondaryColor)} 55%, ${colorHex(editorState.accentColor)} 100%)`,
  }

  return (
    <aside className={styles.panel} aria-label="Object preview">
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
          <dt>Material</dt>
          <dd>{editorState.material}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Condition</dt>
          <dd>{editorState.condition}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Scale</dt>
          <dd>{editorState.scale}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Style</dt>
          <dd>{editorState.style}</dd>
        </div>
      </dl>
      <p className={styles.note}>Placeholder preview — visual catalog only.</p>
    </aside>
  )
}
