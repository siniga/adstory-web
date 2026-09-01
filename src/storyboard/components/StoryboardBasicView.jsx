import { getShotDisplayImageUrl } from '../../utils/resolveMediaUrl'
import ShotCardOverlay from './ShotCardOverlay'
import { sceneDisplayLabel, sortShots, shotDisplayTitle } from '../shotLightbox'
import styles from '../ProjectStoryboard.module.css'

function cameraLine(shot) {
  return [shot?.shotSize, shot?.cameraAngle, shot?.cameraMovement]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .join(' · ')
}

function placeholderShots(scene) {
  const count = Number(scene?.shotCount ?? scene?.shot_count ?? 0)
  if (!Number.isFinite(count) || count <= 0) return []

  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${scene.apiId ?? scene.id}-${index + 1}`,
    shot_number: index + 1,
    title: `Shot ${index + 1}`,
  }))
}

function shotsForScene(scene, shotsBySceneId) {
  const sceneKey = scene.apiId ?? scene.id
  const loaded = sortShots(shotsBySceneId[sceneKey] ?? shotsBySceneId[String(sceneKey)] ?? [])
  return loaded.length ? loaded : placeholderShots(scene)
}

function BasicShotCard({
  shot,
  scene,
  index,
  total,
  generating = false,
  onFullscreen,
  onRegenerate,
}) {
  const imageUrl = getShotDisplayImageUrl(shot)
  const number = shot?.shot_number ?? index + 1
  const title = shotDisplayTitle(shot, index)
  const meta = cameraLine(shot)

  return (
    <article className={styles.basicShotCard} aria-label={`${title} (${number} of ${total})`}>
      <div className={styles.basicShotFrame}>
        {imageUrl ? (
          <img src={imageUrl} alt={title} className={styles.basicShotImage} loading="lazy" />
        ) : (
          <div className={styles.basicShotPlaceholder}>
            <span className={styles.basicShotIndex}>{number}</span>
            <span>Image pending</span>
          </div>
        )}
        <ShotCardOverlay
          hasImage={Boolean(imageUrl)}
          regenerating={generating}
          canRegenerate={Boolean(shot.apiId)}
          onFullscreen={() => onFullscreen?.(shot, scene)}
          onRegenerate={() => onRegenerate?.(shot, scene)}
        />
      </div>
      <div className={styles.basicShotCaption}>
        <p className={styles.basicShotNumber}>
          Shot {number} of {total}
        </p>
        <p className={styles.basicShotTitle}>{title}</p>
        {meta ? <p className={styles.basicShotMeta}>{meta}</p> : null}
      </div>
    </article>
  )
}

export default function StoryboardBasicView({
  scenes = [],
  shotsBySceneId = {},
  loading = false,
  generatingShotId = null,
  onFullscreenShot,
  onRegenerateShot,
}) {
  if (loading && !scenes.length) {
    return (
      <div className={styles.basicView}>
        <p className={styles.basicEmpty}>Loading storyboard…</p>
      </div>
    )
  }

  if (!scenes.length) {
    return (
      <div className={styles.basicView}>
        <p className={styles.basicEmpty}>No scenes yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.basicView}>
      {scenes.map((scene) => {
        const sceneKey = scene.apiId ?? scene.id
        const shots = shotsForScene(scene, shotsBySceneId)
        const shotCount = shots.length

        return (
          <section key={sceneKey} className={styles.basicScene}>
            <header className={styles.basicSceneHeader}>
              <h2 className={styles.basicSceneName}>{sceneDisplayLabel(scene)}</h2>
              <p className={styles.basicSceneCount}>
                {shotCount} shot{shotCount === 1 ? '' : 's'}
              </p>
            </header>
            {shotCount ? (
              <div className={styles.basicShotList}>
                {shots.map((shot, index) => (
                  <BasicShotCard
                    key={shot.id ?? shot.apiId ?? `${sceneKey}-${index}`}
                    shot={shot}
                    scene={scene}
                    index={index}
                    total={shotCount}
                    generating={
                      shot.apiId != null && String(generatingShotId) === String(shot.apiId)
                    }
                    onFullscreen={onFullscreenShot}
                    onRegenerate={onRegenerateShot}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.basicEmpty}>No shots in this scene yet.</p>
            )}
          </section>
        )
      })}
    </div>
  )
}
