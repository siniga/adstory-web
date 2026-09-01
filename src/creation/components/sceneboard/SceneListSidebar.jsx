import { useEffect, useRef, useState } from 'react'
import {
  getSidebarSceneStatus,
} from '../../sceneboardStatus'
import styles from './Sceneboard.module.css'

function badgeClass(tone) {
  if (tone === 'generating') return styles.badgeGenerating
  if (tone === 'completed') return styles.badgeCompleted
  if (tone === 'failed') return styles.badgeFailed
  return styles.badgeIdle
}

export default function SceneListSidebar({
  scenes = [],
  selectedSceneId,
  sceneGenerationActive = false,
  onSelectScene,
  onAddSceneAtEnd,
  onEditScene,
  onAddSceneBefore,
  onAddSceneAfter,
  onDeleteScene,
}) {
  const [openMenuSceneId, setOpenMenuSceneId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!openMenuSceneId) return undefined

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuSceneId(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openMenuSceneId])

  const closeMenu = () => setOpenMenuSceneId(null)

  const handleMenuAction = (action, scene) => {
    closeMenu()
    action(scene)
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderCopy}>
          <h2 className={styles.sidebarTitle}>Sequences</h2>
          {sceneGenerationActive ? (
            <p className={styles.sidebarGeneratingHint} role="status">
              Generating sequences…
            </p>
          ) : null}
        </div>
        <button
          type="button"
          className={styles.sidebarAddBtn}
          onClick={onAddSceneAtEnd}
          aria-label="Add sequence at end"
          title="Add sequence at end"
        >
          +
        </button>
      </div>
      <div className={styles.sceneList}>
        {scenes.map((scene) => {
          const isSelected = String(scene.apiId) === String(selectedSceneId)
          const { label: statusLabel, tone } = getSidebarSceneStatus(scene, {
            sceneGenerationActive,
          })
          const menuOpen = String(openMenuSceneId) === String(scene.apiId)

          return (
            <div
              key={scene.apiId ?? scene.scene_number}
              className={`${styles.sceneItemRow} ${isSelected ? styles.sceneItemRowSelected : ''}`}
            >
              <button
                type="button"
                className={`${styles.sceneItem} ${isSelected ? styles.sceneItemSelected : ''}`}
                onClick={() => onSelectScene(scene.apiId)}
              >
                <span className={styles.sceneItemNumber}>
                  Sequence {scene.scene_number ?? '—'}
                </span>
                <span className={styles.sceneItemTitle}>{scene.title || 'Untitled sequence'}</span>
                <span className={`${styles.statusBadge} ${badgeClass(tone)}`}>
                  {statusLabel}
                </span>
              </button>
              <div className={styles.sceneItemMenuWrap} ref={menuOpen ? menuRef : null}>
                <button
                  type="button"
                  className={styles.sceneItemMenuBtn}
                  aria-label={`Sequence actions for ${scene.title || 'sequence'}`}
                  aria-expanded={menuOpen}
                  onClick={(event) => {
                    event.stopPropagation()
                    setOpenMenuSceneId(menuOpen ? null : scene.apiId)
                  }}
                >
                  ⋯
                </button>
                {menuOpen ? (
                  <div className={styles.sceneItemMenu} role="menu">
                    <button
                      type="button"
                      className={styles.sceneItemMenuItem}
                      role="menuitem"
                      onClick={() => handleMenuAction(onEditScene, scene)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={styles.sceneItemMenuItem}
                      role="menuitem"
                      onClick={() => handleMenuAction(onAddSceneBefore, scene)}
                    >
                      Add Before
                    </button>
                    <button
                      type="button"
                      className={styles.sceneItemMenuItem}
                      role="menuitem"
                      onClick={() => handleMenuAction(onAddSceneAfter, scene)}
                    >
                      Add After
                    </button>
                    <button
                      type="button"
                      className={`${styles.sceneItemMenuItem} ${styles.sceneItemMenuItemDanger}`}
                      role="menuitem"
                      onClick={() => handleMenuAction(onDeleteScene, scene)}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
