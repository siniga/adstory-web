import { memo, useMemo, useState } from 'react'
import {
  getStoryboardSceneStatusLabel,
  getStoryboardSceneStatusTone,
} from '../storyboardWorkspaceStatus'
import styles from '../ProjectStoryboard.module.css'

function statusClass(tone) {
  if (tone === 'generating') return styles.statusGenerating
  if (tone === 'completed') return styles.statusCompleted
  if (tone === 'failed') return styles.statusFailed
  return styles.statusIdle
}

const StoryboardSceneCard = memo(function StoryboardSceneCard({
  scene,
  selected,
  onSelect,
}) {
  const tone = getStoryboardSceneStatusTone(scene)
  const statusLabel = getStoryboardSceneStatusLabel(scene)
  const shotCount = scene.shotCount ?? 0
  const shotLabel =
    shotCount > 0 ? `${shotCount} shot${shotCount === 1 ? '' : 's'}` : '0 shots'

  return (
    <button
      type="button"
      className={`${styles.sceneItem} ${selected ? styles.sceneItemSelected : ''}`}
      onClick={() => onSelect?.(scene.apiId)}
    >
      <div className={styles.sceneItemTop}>
        <span className={styles.sceneNumber}>
          <span className={styles.sceneRadio} aria-hidden="true" />
          Scene {scene.scene_number ?? '—'}
        </span>
        <span className={`${styles.statusBadge} ${statusClass(tone)}`}>{statusLabel}</span>
      </div>
      <p className={styles.sceneTitle}>{scene.title || 'Untitled scene'}</p>
      <div className={styles.sceneMeta}>
        <span>{shotLabel}</span>
      </div>
    </button>
  )
})

export default function StoryboardWorkspaceSceneList({
  scenes = [],
  selectedSceneId,
  loading = false,
  onSelectScene,
  onAddScene,
  addingScene = false,
}) {
  const [query, setQuery] = useState('')

  const filteredScenes = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return scenes

    return scenes.filter((scene) => {
      const haystack = [
        scene.title,
        scene.description,
        scene.location,
        scene.scene_number != null ? `Scene ${scene.scene_number}` : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalized)
    })
  }, [query, scenes])

  return (
    <aside className={styles.sceneList}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Scenes</h2>
        <input
          type="search"
          className={styles.sceneSearch}
          placeholder="Search scenes…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search scenes"
        />
      </div>

      <div className={styles.panelBody}>
        {loading && !scenes.length ? (
          <div className={styles.skeletonList} aria-hidden="true">
            <div className={`${styles.skeletonBlock} ${styles.skeletonScene}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonScene}`} />
            <div className={`${styles.skeletonBlock} ${styles.skeletonScene}`} />
          </div>
        ) : null}

        {!loading || scenes.length ? (
          <div className={styles.sceneListItems}>
            {filteredScenes.map((scene) => (
              <StoryboardSceneCard
                key={scene.apiId}
                scene={scene}
                selected={String(scene.apiId) === String(selectedSceneId)}
                onSelect={onSelectScene}
              />
            ))}
            {!filteredScenes.length && !loading ? (
              <p className={styles.emptyText} style={{ margin: 0 }}>
                No scenes match your search.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={styles.panelFooter}>
        <button
          type="button"
          className={styles.primaryBtn}
          style={{ width: '100%' }}
          onClick={onAddScene}
          disabled={addingScene}
        >
          {addingScene ? 'Adding…' : '+ Add Scene'}
        </button>
      </div>
    </aside>
  )
}
