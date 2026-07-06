import { useEffect, useRef } from 'react'
import { BRAND } from '../../config/branding'
import { SCENE_IMAGE_STATUS, getSceneImageStatus, getSceneStatusBadgeLabel, isSceneGenerating } from '../imageStatus'
import { getActiveScenes } from '../activeProject'
import { getShotSelectionKey, isShotSelected } from '../shotSelection'
import { ASSET_TOOLS } from '../data'
import { IconChevronDown, IconPlus, IconWand } from '../icons'
import { SceneStatusBadge } from './ImageStatusBadge'
import styles from './LeftSidebar.module.css'

export default function LeftSidebar({
  selectedShotId,
  onSelectShot,
  onOpenCharacterLibrary,
  onOpenEnvironmentLibrary,
  onOpenObjectLibrary,
  generatingSceneIds = {},
  onGenerateSceneImages,
}) {
  const activeRef = useRef(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [selectedShotId])

  const scenes = getActiveScenes()

  return (
    <aside className={styles.sidebar}>
      <div className={styles.scenesHeader}>
        <h2 className={styles.scenesTitle}>Scenes &amp; Shots</h2>
        <button type="button" className={styles.addBtn} aria-label="Add scene">
          <IconPlus />
        </button>
      </div>

      <div className={styles.sceneList}>
        {scenes.map((scene) => {
          const isGenerating = isSceneGenerating(generatingSceneIds, scene.apiId)
          const sceneStatus = getSceneImageStatus(scene, { isSceneGenerating: isGenerating })
          const sceneStatusLabel = getSceneStatusBadgeLabel(sceneStatus)
          const shotCount = scene.shots?.length ?? 0
          const showGenerateButton =
            scene.id > 1 &&
            sceneStatus !== SCENE_IMAGE_STATUS.COMPLETE &&
            onGenerateSceneImages

          return (
          <div key={scene.id} className={styles.sceneGroup}>
            <button type="button" className={styles.sceneRow}>
              <span className={styles.sceneChevron} aria-hidden="true">
                <IconChevronDown />
              </span>
              <span className={styles.sceneRowBody}>
                <span className={styles.sceneHeading}>
                  <span className={styles.sceneName}>Scene {scene.id}</span>
                  <SceneStatusBadge status={sceneStatus} label={sceneStatusLabel} />
                </span>
                {scene.title ? (
                  <span className={styles.sceneSubtitle}>{scene.title}</span>
                ) : null}
                <span className={styles.sceneShotCount}>
                  {shotCount} Shot{shotCount === 1 ? '' : 's'}
                </span>
              </span>
            </button>
            {showGenerateButton && (
              <button
                type="button"
                className={styles.generateSceneBtn}
                disabled={isGenerating}
                onClick={() => onGenerateSceneImages(scene.apiId)}
              >
                {isGenerating ? 'Generating...' : 'Generate Images for Scene'}
              </button>
            )}
            <ul className={styles.shotList} role="listbox">
              {scene.shots.map((shot) => {
                const selectionKey = getShotSelectionKey(scene, shot)
                const isSelected = isShotSelected(scene, shot, selectedShotId)
                return (
                  <li key={selectionKey}>
                    <button
                      ref={isSelected ? activeRef : null}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`${styles.shotItem} ${isSelected ? styles.shotItemActive : ''}`}
                      onClick={() => onSelectShot(selectionKey)}
                    >
                      <span className={styles.shotId}>Shot {shot.id}</span>
                      <span className={styles.shotLabel}>{shot.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          )
        })}
      </div>

      <div className={styles.assetsSection}>
        <h3 className={styles.assetsTitle}>Assets &amp; Tools</h3>
        <ul className={styles.toolList}>
          {ASSET_TOOLS.map((tool) => (
            <li key={tool.id}>
              <button
                type="button"
                className={styles.toolItem}
                onClick={
                  tool.id === 'characters'
                    ? onOpenCharacterLibrary
                    : tool.id === 'environments'
                      ? onOpenEnvironmentLibrary
                      : tool.id === 'objects'
                        ? onOpenObjectLibrary
                        : undefined
                }
              >
                <span className={styles.toolSquare} style={{ background: tool.color }} />
                <span>{tool.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" className={styles.editBtn}>
          <IconWand />
          <span>Edit Shot Image</span>
        </button>
      </div>

      <div className={styles.profile}>
        <span className={styles.avatar}>{BRAND.avatarInitial}</span>
        <div className={styles.profileMeta}>
          <span className={styles.profileName}>{BRAND.teamName}</span>
          <span className={styles.profilePlan}>Pro Plan</span>
        </div>
      </div>
    </aside>
  )
}
