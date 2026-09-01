import { useMemo } from 'react'
import StoryboardShotCard from './StoryboardShotCard'
import { userErrorText } from '../../utils/userFriendlyErrors'
import styles from '../ProjectStoryboard.module.css'

function SceneChip({ icon, label }) {
  if (!label) return null
  return (
    <span className={styles.sceneChip}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  )
}

function sortShots(shots = []) {
  return [...shots].sort(
    (a, b) =>
      (a.order_index ?? 0) - (b.order_index ?? 0) ||
      String(a.shot_number ?? '').localeCompare(String(b.shot_number ?? ''), undefined, {
        numeric: true,
      })
  )
}

export default function StoryboardShotsPanel({
  scene,
  shots = [],
  selectedShotId,
  sceneLoading = false,
  generationActive = false,
  generationStarting = false,
  generationError,
  generatingShotId,
  addingShot = false,
  onGenerateShots,
  onSelectShot,
  onGenerateImage,
  onAddShot,
  onDuplicateShot,
  onDeleteShot,
  onMoveShot,
  imageGenerationError,
  imageGenerationActive = false,
  onGenerateAllImages,
  onFullscreenShot,
  onRegenerateShot,
}) {
  const orderedShots = useMemo(() => sortShots(shots), [shots])
  const hasShots = orderedShots.length > 0
  const shotCountLabel = scene?.shotCount ?? orderedShots.length

  return (
    <section className={styles.shotsArea}>
      <div className={styles.shotsScroll}>
        {scene ? (
          <header className={styles.sceneHero}>
            <p className={styles.sceneHeroLabel}>Scene {scene.scene_number ?? '—'}</p>
            <h1 className={styles.sceneHeroTitle}>{scene.title || 'Untitled scene'}</h1>

            <div className={styles.sceneChips}>
              <SceneChip icon="📍" label={scene.location} />
              <SceneChip icon="☀" label={scene.time_of_day} />
              <SceneChip icon="😊" label={scene.mood} />
              <SceneChip
                icon="🎬"
                label={`${shotCountLabel} Shot${shotCountLabel === 1 ? '' : 's'}`}
              />
            </div>
          </header>
        ) : null}

        {generationError ? (
          <div className={styles.errorBox} role="alert">
            {userErrorText(generationError)}
          </div>
        ) : null}

        {imageGenerationError ? (
          <div className={styles.errorBox} role="alert">
            {userErrorText(imageGenerationError)}
          </div>
        ) : null}

        {sceneLoading ? (
          <div className={styles.skeletonList} aria-hidden="true">
            <div className={`${styles.skeletonBlock} ${styles.skeletonShot}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonShot}`} />
          </div>
        ) : null}

        {!sceneLoading && !hasShots ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              🎬
            </div>
            <h2 className={styles.emptyTitle}>No shots in this scene yet</h2>
            <p className={styles.emptyText}>
              Generate storyboard shots for this scene, or add a shot manually.
            </p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onGenerateShots}
              disabled={generationStarting || generationActive || !scene}
            >
              {generationStarting ? 'Starting…' : 'Generate Shots'}
            </button>
          </div>
        ) : null}

        {!sceneLoading && hasShots ? (
          <>
            <div className={styles.shotsToolbar}>
              <h2 className={styles.shotsToolbarTitle}>Shots</h2>
              <div className={styles.shotsToolbarActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onGenerateAllImages}
                  disabled={imageGenerationActive || !scene}
                >
                  {imageGenerationActive ? 'Generating…' : 'Generate All Images'}
                </button>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={onAddShot}
                  disabled={addingShot || !scene}
                >
                  {addingShot ? 'Adding…' : '+ Add Shot'}
                </button>
              </div>
            </div>

            <div className={styles.shotsList}>
              {orderedShots.map((shot, index) => {
                const shotKey = shot.id ?? shot.apiId ?? `${index}`
                return (
                  <StoryboardShotCard
                    key={shotKey}
                    shot={shot}
                    selected={String(shotKey) === String(selectedShotId)}
                    generating={String(generatingShotId) === String(shot.apiId)}
                    isFirst={index === 0}
                    isLast={index === orderedShots.length - 1}
                    onSelect={onSelectShot}
                    onGenerateImage={onGenerateImage}
                    onRetryImage={onGenerateImage}
                    onDuplicate={onDuplicateShot}
                    onDelete={onDeleteShot}
                    onMoveUp={() => onMoveShot?.(shot, 'up')}
                    onMoveDown={() => onMoveShot?.(shot, 'down')}
                    onFullscreen={onFullscreenShot}
                    onRegenerate={onRegenerateShot}
                  />
                )
              })}
            </div>
          </>
        ) : null}
      </div>
    </section>
  )
}
