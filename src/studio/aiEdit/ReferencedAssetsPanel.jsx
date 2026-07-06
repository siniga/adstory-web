import styles from './AIEditPanel.module.css'

export default function ReferencedAssetsPanel({ characters, environment, objects, selectedAssetLabel }) {
  return (
    <section className={styles.section}>
      <h4 className={styles.sectionTitle}>Referenced Assets</h4>
      <dl className={styles.assetRefs}>
        <div className={styles.assetRefRow}>
          <dt>Character:</dt>
          <dd>{characters.length > 0 ? characters.join(', ') : '—'}</dd>
        </div>
        <div className={styles.assetRefRow}>
          <dt>Environment:</dt>
          <dd>{environment ?? '—'}</dd>
        </div>
        <div className={styles.assetRefRow}>
          <dt>Objects:</dt>
          <dd>{objects.length > 0 ? objects.join(', ') : '—'}</dd>
        </div>
        {selectedAssetLabel && (
          <div className={styles.assetRefRow}>
            <dt>Selected:</dt>
            <dd>{selectedAssetLabel}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
