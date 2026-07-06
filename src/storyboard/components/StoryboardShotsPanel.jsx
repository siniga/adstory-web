import { useMemo } from 'react'
import StoryboardSceneImageProgressPanel from './StoryboardSceneImageProgressPanel'
import StoryboardShotCard from './StoryboardShotCard'
import StoryboardShotProgressPanel from './StoryboardShotProgressPanel'
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
  generationCancelling = false,
  generationError,
  progress,
  generatingShotId,
  addingShot = false,
  onGenerateShots,
  onCancelGeneration,
  onSelectShot,
  onGenerateImage,
  onAddShot,
  onDuplicateShot,
  onDeleteShot,
  onMoveShot,
  imageGenerationProgress,
  imageGenerationStarting = false,
  imageGenerationResuming = false,
  imageGenerationActive = false,
  imageGenerationComplete = false,
  imageGenerationStalled = false,
  imageGenerationSlowProgress = false,
  imageGenerationError,
  onGenerateAllImages,
  onResumeImageGeneration,
  onDismissSlowImageProgress,
  onCancelImageGeneration,
  imageGenerationCancelling = false,
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

            {!sceneLoading && hasShots ? (
              <StoryboardSceneImageProgressPanel
                progress={imageGenerationProgress}
                starting={imageGenerationStarting}
                resuming={imageGenerationResuming}
                generationActive={imageGenerationActive}
                generationComplete={imageGenerationComplete}
                stalled={imageGenerationStalled}
                slowProgress={imageGenerationSlowProgress}
                hasShots={hasShots}
                onGenerateAll={onGenerateAllImages}
                onResume={onResumeImageGeneration}
                onKeepWaiting={onDismissSlowImageProgress}
                onCancel={onCancelImageGeneration}
                cancelling={imageGenerationCancelling}
              />
            ) : null}

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
            {generationError}
          </div>
        ) : null}

        {imageGenerationError ? (
          <div className={styles.errorBox} role="alert">
            {imageGenerationError}
          </div>
        ) : null}

        {generationActive && progress ? (
          <StoryboardShotProgressPanel
            progress={progress}
            onCancel={onCancelGeneration}
            cancelling={generationCancelling}
          />
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
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onAddShot}
                disabled={addingShot || !scene}
              >
                {addingShot ? 'Adding…' : '+ Add Shot'}
              </button>
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
