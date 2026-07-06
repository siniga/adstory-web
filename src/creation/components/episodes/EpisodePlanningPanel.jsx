import styles from './Episodes.module.css'

export const MAX_SCENES_PER_EPISODE = 5

export default function EpisodePlanningPanel({ analyzing = false, onAnalyze }) {
  return (
    <section className={styles.planningPanel} aria-labelledby="episode-planning-title">
      <div className={styles.planningIcon} aria-hidden="true">
        EP
      </div>
      <h2 id="episode-planning-title" className={styles.planningTitle}>
        Plan your episodes
      </h2>
      <p className={styles.planningText}>
        Adstory will divide your screenplay into manageable episodes. Each episode can contain up
        to {MAX_SCENES_PER_EPISODE} scenes. This keeps generation faster and easier to edit.
      </p>

      <dl className={styles.planningStats}>
        <div>
          <dt>Max scenes per episode</dt>
          <dd>{MAX_SCENES_PER_EPISODE}</dd>
        </div>
        <div>
          <dt>Current status</dt>
          <dd>{analyzing ? 'Analyzing…' : 'Not planned'}</dd>
        </div>
      </dl>

      {analyzing ? (
        <p className={styles.planningLoading} role="status">
          Analyzing screenplay…
        </p>
      ) : null}

      <button
        type="button"
        className={styles.planningBtn}
        onClick={onAnalyze}
        disabled={analyzing}
      >
        {analyzing ? 'Analyzing screenplay…' : 'Analyze Screenplay'}
      </button>
    </section>
  )
}
