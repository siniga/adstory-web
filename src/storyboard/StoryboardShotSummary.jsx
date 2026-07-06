import {
  resolveShotCharacters,
  resolveShotEnvironment,
  resolveShotObjects,
} from '../studio/resolveShotAssets'
import styles from './StoryboardShotSummary.module.css'

export default function StoryboardShotSummary({
  shot,
  scene,
  shotAssignments = {},
  projectCharacters = [],
  projectEnvironments = [],
  projectObjects = [],
}) {
  if (!shot || !scene) {
    return (
      <aside className={styles.panel} aria-label="Shot summary">
        <p className={styles.empty}>Select a shot to view details.</p>
      </aside>
    )
  }

  const characters = resolveShotCharacters(shot, shotAssignments, projectCharacters)
  const environment = resolveShotEnvironment(shot, shotAssignments, projectEnvironments)
  const objects = resolveShotObjects(shot, shotAssignments, projectObjects)

  return (
    <aside className={styles.panel} aria-label="Shot summary">
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Shot Summary</h2>
        <p className={styles.shotTitle}>{shot.label}</p>
        <dl className={styles.metaList}>
          <div className={styles.metaRow}>
            <dt>Scene</dt>
            <dd>{scene.title}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Shot</dt>
            <dd>{shot.id}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Type</dt>
            <dd>{shot.shotType ?? '—'}</dd>
          </div>
          <div className={styles.metaRow}>
            <dt>Duration</dt>
            <dd>{shot.duration ?? '—'}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Assigned Characters</h3>
        {characters.length ? (
          <ul className={styles.assetList}>
            {characters.map((character) => (
              <li key={character.id}>{character.name ?? character.label ?? 'Character'}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyLine}>None assigned</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Assigned Environment</h3>
        <p className={styles.assetLine}>
          {environment?.name ?? environment?.title ?? 'None assigned'}
        </p>
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Assigned Objects</h3>
        {objects.length ? (
          <ul className={styles.assetList}>
            {objects.map((object) => (
              <li key={object.id}>{object.name ?? object.label ?? 'Object'}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.emptyLine}>None assigned</p>
        )}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Shot Prompt</h3>
        <p className={styles.prompt}>{shot.prompt?.trim() || 'No prompt generated yet.'}</p>
      </section>
    </aside>
  )
}
