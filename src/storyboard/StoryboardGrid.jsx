import { resolveShotImageSrc } from '../utils/resolveMediaUrl'
import { shotHasStoryboardImage } from './storyboardStatus'
import styles from './StoryboardGrid.module.css'

function StoryboardShotCard({ scene, shot, isGenerating = false, isSelected = false, onSelect }) {
  const imageSrc = resolveShotImageSrc(shot)
  const hasImage = shotHasStoryboardImage(shot)

  return (
    <article
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={() => onSelect?.(scene, shot)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect?.(scene, shot)
        }
      }}
    >
      <div
        className={styles.thumb}
        style={imageSrc ? { backgroundImage: `url(${imageSrc})` } : undefined}
      >
        {!imageSrc ? (
          <div className={styles.thumbGradient} style={{ background: shot.thumbGradient }} />
        ) : null}
        {isGenerating ? (
          <div className={styles.thumbLoader} aria-label="Generating image">
            <span className={styles.thumbSpinner} />
          </div>
        ) : null}
        {!hasImage && !isGenerating ? (
          <span className={styles.pendingBadge}>Pending</span>
        ) : null}
        {hasImage ? <span className={styles.doneBadge}>Done</span> : null}
        {!isGenerating ? (
          <button
            type="button"
            className={styles.presetsBtn}
            onClick={(event) => {
              event.stopPropagation()
              onSelect?.(scene, shot)
            }}
            aria-label="Open storyboard presets"
            title="Edit presets & references"
          >
            Presets
          </button>
        ) : null}
      </div>
      <div className={styles.cardMeta}>
        <span className={styles.cardId}>
          Scene {scene.id} · Shot {shot.id}
        </span>
        <span className={styles.cardLabel}>{shot.label ?? 'Untitled shot'}</span>
      </div>
    </article>
  )
}

export default function StoryboardGrid({
  scenes = [],
  generatingSceneIds = {},
  onGenerateScene,
  generatingProject = false,
  selectedShotApiId = null,
  onSelectShot,
}) {
  return (
    <div className={styles.content}>
      {scenes.map((scene) => {
        const sceneGenerating =
          generatingProject || Boolean(generatingSceneIds[String(scene.apiId)])

        return (
          <section key={scene.id} className={styles.sceneSection}>
            <div className={styles.sceneHeader}>
              <div className={styles.sceneHeaderMain}>
                <h2 className={styles.sceneTitle}>
                  Scene {scene.id}
                  {scene.title ? `: ${scene.title}` : ''}
                </h2>
                <span className={styles.sceneMeta}>
                  {scene.shots?.length ?? 0} shot{(scene.shots?.length ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              {onGenerateScene && scene.apiId ? (
                <button
                  type="button"
                  className={styles.sceneGenerateBtn}
                  onClick={() => onGenerateScene(scene.apiId)}
                  disabled={sceneGenerating || generatingProject}
                >
                  {sceneGenerating ? 'Generating…' : 'Generate Storyboard For Scene'}
                </button>
              ) : null}
            </div>
            <div className={styles.grid}>
              {(scene.shots ?? []).map((shot) => (
                <StoryboardShotCard
                  key={shot.apiId ?? `${scene.id}:${shot.id}`}
                  scene={scene}
                  shot={shot}
                  isGenerating={sceneGenerating}
                  isSelected={selectedShotApiId != null && String(shot.apiId) === String(selectedShotApiId)}
                  onSelect={onSelectShot}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
