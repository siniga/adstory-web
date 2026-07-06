import styles from './EnvironmentsStep.module.css'

export default function EnvironmentPlanningPanel({ generating = false, onGenerate }) {
  return (
    <section className={styles.planningPanel} aria-labelledby="environment-planning-title">
      <div className={styles.planningIcon} aria-hidden="true">
        LOC
      </div>
      <h2 id="environment-planning-title" className={styles.planningTitle}>
        No environments yet
      </h2>
      <p className={styles.planningText}>
        Adstory can extract key locations and environments from your screenplay.
      </p>

      {generating ? (
        <p className={styles.planningLoading} role="status">
          Starting generation…
        </p>
      ) : null}

      <button
        type="button"
        className={styles.planningBtn}
        onClick={onGenerate}
        disabled={generating}
      >
        {generating ? 'Starting…' : 'Generate Environments'}
      </button>
    </section>
  )
}
