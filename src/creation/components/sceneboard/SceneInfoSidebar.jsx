import styles from './Sceneboard.module.css'

export default function SceneInfoSidebar({ scene }) {
  if (!scene) {
    return (
      <aside className={styles.infoPanel}>
        <h2 className={styles.infoTitle}>Sequence Information</h2>
        <p className={styles.loadingMessage}>Select a sequence to view details.</p>
      </aside>
    )
  }

  const characters = scene.characters?.length
    ? scene.characters.join(', ')
    : '—'
  const environment = scene.environment?.trim() || '—'
  const duration = scene.estimatedDuration ?? '—'
  const aiNotes = scene.aiNotes?.trim()

  return (
    <aside className={styles.infoPanel}>
      <h2 className={styles.infoTitle}>Sequence Information</h2>
      <dl className={styles.infoList}>
        <div className={styles.infoRow}>
          <dt>Characters in Sequence</dt>
          <dd>{characters}</dd>
        </div>
        <div className={styles.infoRow}>
          <dt>Environment</dt>
          <dd>{environment}</dd>
        </div>
        <div className={styles.infoRow}>
          <dt>Estimated Duration</dt>
          <dd>{duration}</dd>
        </div>
        {aiNotes ? (
          <div className={styles.infoRow}>
            <dt>AI Notes</dt>
            <dd>
              <p className={styles.infoNotes}>{aiNotes}</p>
            </dd>
          </div>
        ) : null}
      </dl>
    </aside>
  )
}
