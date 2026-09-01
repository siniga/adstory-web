import { useEffect, useMemo, useState } from 'react'
import { getTotalShotCount } from '../studio/data'
import StoryboardGrid from './StoryboardGrid'
import StoryboardShotSettingsModal from './StoryboardShotSettingsModal'
import styles from './StoryboardPage.module.css'

export default function StoryboardPage({
  projectId,
  studioScenes = [],
  projectName,
  characters = [],
  environments = [],
  generatingSceneIds = {},
  onGenerateSceneImages,
  onGenerateProjectStoryboard,
  onSaveShotStoryboardSettings,
  onGenerateStoryboardShotImage,
  onApproveStoryboardShotImage,
  onDeleteStoryboardShotImage,
  onBackToAssets,
}) {
  const [generatingProject, setGeneratingProject] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [selectedScene, setSelectedScene] = useState(null)
  const [selectedShot, setSelectedShot] = useState(null)

  const shotCount = useMemo(() => getTotalShotCount(studioScenes), [studioScenes])
  const isGeneratingAny =
    generatingProject || Object.values(generatingSceneIds).some(Boolean)

  useEffect(() => {
    if (!selectedShot?.apiId) return
    for (const scene of studioScenes) {
      const match = (scene.shots ?? []).find(
        (shot) => String(shot.apiId) === String(selectedShot.apiId)
      )
      if (match) {
        setSelectedScene(scene)
        setSelectedShot(match)
        return
      }
    }
  }, [selectedShot?.apiId, studioScenes])

  const handleSelectShot = (scene, shot) => {
    setSelectedScene(scene)
    setSelectedShot(shot)
  }

  const handleCloseModal = () => {
    setSelectedScene(null)
    setSelectedShot(null)
  }

  const handleSaveSettings = async (payload) => {
    if (!selectedShot?.apiId || !onSaveShotStoryboardSettings) {
      throw new Error('Shot id is required.')
    }
    await onSaveShotStoryboardSettings(selectedShot.apiId, payload)
  }

  const handleGenerateShotImage = async (payload) => {
    if (!selectedShot?.apiId || !onGenerateStoryboardShotImage) {
      throw new Error('Shot id is required.')
    }
    await onGenerateStoryboardShotImage(selectedShot.apiId, payload)
  }

  const handleApproveShotImage = async (version) => {
    if (!selectedShot?.apiId || !version?.id || !onApproveStoryboardShotImage) {
      throw new Error('Image id is required.')
    }
    await onApproveStoryboardShotImage(selectedShot.apiId, version.id)
  }

  const handleDeleteShotImage = async (version) => {
    if (!selectedShot?.apiId || !version?.id || !onDeleteStoryboardShotImage) {
      throw new Error('Image id is required.')
    }
    await onDeleteStoryboardShotImage(selectedShot.apiId, version.id)
  }

  const handleGenerateScene = async (sceneApiId) => {
    if (!onGenerateSceneImages) return

    setActionError(null)

    try {
      await onGenerateSceneImages(sceneApiId)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scene storyboard generation failed'
      setActionError(message)
    }
  }

  const handleGenerateProject = async () => {
    if (!onGenerateProjectStoryboard) return

    setGeneratingProject(true)
    setActionError(null)

    try {
      await onGenerateProjectStoryboard()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Project storyboard generation failed'
      setActionError(message)
    } finally {
      setGeneratingProject(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topBarMain}>
          {onBackToAssets ? (
            <button type="button" className={styles.backBtn} onClick={onBackToAssets}>
              ← Assets
            </button>
          ) : null}
          <div className={styles.titleBlock}>
            <span className={styles.eyebrow}>Storyboard</span>
            <h1 className={styles.title}>{projectName || 'Untitled Project'}</h1>
            <p className={styles.subtitle}>
              {studioScenes.length} scene{studioScenes.length === 1 ? '' : 's'} · {shotCount}{' '}
              shot{shotCount === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className={styles.topBarActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleGenerateProject}
            disabled={isGeneratingAny || !onGenerateProjectStoryboard}
          >
            {generatingProject ? 'Generating project…' : 'Generate Storyboard For Project'}
          </button>
        </div>
      </header>

      {actionError ? <p className={styles.bannerError}>{actionError}</p> : null}

      <StoryboardGrid
        scenes={studioScenes}
        generatingSceneIds={generatingSceneIds}
        onGenerateScene={onGenerateSceneImages ? handleGenerateScene : undefined}
        generatingProject={generatingProject}
        selectedShotApiId={selectedShot?.apiId ?? null}
        onSelectShot={handleSelectShot}
      />

      <StoryboardShotSettingsModal
        open={Boolean(selectedShot)}
        scene={selectedScene}
        shot={selectedShot}
        projectId={projectId}
        characters={characters}
        environments={environments}
        onClose={handleCloseModal}
        onSave={handleSaveSettings}
        onGenerateImage={onGenerateStoryboardShotImage ? handleGenerateShotImage : undefined}
        onApproveVersion={onApproveStoryboardShotImage ? handleApproveShotImage : undefined}
        onDeleteVersion={onDeleteStoryboardShotImage ? handleDeleteShotImage : undefined}
      />
    </div>
  )
}
