import styles from './Episodes.module.css'

export default function ShotList({ shots = [] }) {
  if (!shots.length) return null

  return (
    <div className={styles.shotList}>
      {shots.map((shot) => (
        <div key={shot.id ?? `${shot.shot_number}-${shot.title}`} className={styles.shotCard}>
          <p className={styles.shotTitle}>
            Shot {shot.shot_number ?? '—'}
            {shot.title ? `: ${shot.title}` : ''}
          </p>
          {shot.description ? <p className={styles.shotMeta}>{shot.description}</p> : null}
          {shot.shot_size ? <p className={styles.shotMeta}>{shot.shot_size}</p> : null}
        </div>
      ))}
    </div>
  )
}
