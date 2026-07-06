import { buildMediaThumbStyle } from '../../utils/resolveMediaUrl'
import styles from './EnvironmentPreviewPanel.module.css'

function buildAfterGradient(editorState) {
  const paletteMap = {
    'Warm Orange': 'linear-gradient(160deg, #c45c2a 0%, #f0a050 50%, #fde68a 100%)',
    'Cool Blue': 'linear-gradient(160deg, #0c1445 0%, #0891b2 50%, #38bdf8 100%)',
    'Green Natural': 'linear-gradient(160deg, #14532d 0%, #65a30d 50%, #a3e635 100%)',
    'Dark Cinematic': 'linear-gradient(160deg, #0a0a0a 0%, #312e81 50%, #ec4899 100%)',
    'Bright Commercial': 'linear-gradient(160deg, #fff 0%, #fef08a 50%, #38bdf8 100%)',
  }
  return paletteMap[editorState.colorPalette] ?? paletteMap['Warm Orange']
}

export default function EnvironmentPreviewPanel({ environment, editorState }) {
  const beforeStyle = buildMediaThumbStyle(
    environment.previewImage,
    environment.thumbnailGradient
  )

  const afterStyle = { background: buildAfterGradient(editorState) }

  return (
    <aside className={styles.panel} aria-label="Environment preview">
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
          <dt>Location</dt>
          <dd>{editorState.location}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Time</dt>
          <dd>{editorState.timeOfDay}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Weather</dt>
          <dd>{editorState.weather}</dd>
        </div>
        <div className={styles.summaryRow}>
          <dt>Lighting</dt>
          <dd>{editorState.lighting}</dd>
        </div>
      </dl>
      <p className={styles.note}>Placeholder preview — visual catalog only.</p>
    </aside>
  )
}
