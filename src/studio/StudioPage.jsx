import { useEffect, useMemo, useState } from 'react'
import CharacterLibraryModal from './characters/CharacterLibraryModal'
import CharacterEditorStudio from './characterEditor/CharacterEditorStudio'
import EnvironmentEditorStudio from './environmentEditor/EnvironmentEditorStudio'
import EnvironmentLibraryModal from './environments/EnvironmentLibraryModal'
import ObjectEditorStudio from './objectEditor/ObjectEditorStudio'
import ObjectLibraryModal from './objects/ObjectLibraryModal'
import ApplyScopeModal from './applyScope/ApplyScopeModal'
import CanvasPreview from './components/CanvasPreview'
import ShotCandidateSelectionModal from './components/ShotCandidateSelectionModal'
import FocusModeControls from './components/FocusModeControls'
import LeftSidebar from './components/LeftSidebar'
import RightPanel from './components/RightPanel'
import StatusBar from './components/StatusBar'
import Timeline from './components/Timeline'
import TopBar from './components/TopBar'
import { createDefaultAssignmentTimestamps } from './inspector/formatRelativeTime'
import {
  findSelectableRegion,
  getSelectableRegions,
} from './selection/selectableRegionsData'
import { findShotById } from './data'
import { setActiveStudioProject } from './activeProject'
import { resolveShotCharacters } from './resolveShotAssets'
import { useStudioFocusMode } from './useStudioFocusMode'
import styles from './StudioPage.module.css'

export default function StudioPage({
  studioScenes,
  projectName,
  initialShotAssignments,
  firstShotId = '1.1',
  generatingSceneIds = {},
  onGenerateSceneImages,
  regeneratingShotApiId = null,
  selectingShotCandidateId = null,
  onRegenerateShot,
  onRegenerateShotCandidates,
  onSelectShotCandidate,
  isActive = true,
  onFocusModeChange,
  onSaveShot,
  projectCharacters = [],
  projectEnvironments = [],
  projectObjects = [],
  onReassignAssets,
  onRefreshAssignments,
  onUpdateShotReviewStatus,
  onBackToStory,
}) {
  const [selectedShotId, setSelectedShotId] = useState(firstShotId)
  const [activeRightTab, setActiveRightTab] = useState('Edit')
  const [savingReviewStatus, setSavingReviewStatus] = useState(false)
  const [characterLibraryOpen, setCharacterLibraryOpen] = useState(false)
  const [environmentLibraryOpen, setEnvironmentLibraryOpen] = useState(false)
  const [objectLibraryOpen, setObjectLibraryOpen] = useState(false)
  const [shotAssignments, setShotAssignments] = useState(initialShotAssignments ?? {})
  const [assignmentTimestamps, setAssignmentTimestamps] = useState(() =>
    createDefaultAssignmentTimestamps(Object.keys(initialShotAssignments ?? {}))
  )
  const [activeCanvasTool, setActiveCanvasTool] = useState('select')
  const [selectedRegionId, setSelectedRegionId] = useState(null)
  const [characterEditorOpen, setCharacterEditorOpen] = useState(false)
  const [editingCharacterId, setEditingCharacterId] = useState(null)
  const [environmentEditorOpen, setEnvironmentEditorOpen] = useState(false)
  const [editingEnvironmentId, setEditingEnvironmentId] = useState(null)
  const [objectEditorOpen, setObjectEditorOpen] = useState(false)
  const [editingObjectId, setEditingObjectId] = useState(null)
  const [applyScopeModalOpen, setApplyScopeModalOpen] = useState(false)
  const [applyScopeConfig, setApplyScopeConfig] = useState(null)
  const [showShotCaptions, setShowShotCaptions] = useState(false)
  const [candidateSelection, setCandidateSelection] = useState(null)
  const [candidateSelectionError, setCandidateSelectionError] = useState(null)
  const [regeneratingCandidateOptions, setRegeneratingCandidateOptions] = useState(false)

  const {
    isFocusMode,
    showLeftPanel,
    showRightPanel,
    setShowLeftPanel,
    setShowRightPanel,
    enterFocusMode,
    exitFocusMode,
  } = useStudioFocusMode({ enabled: isActive, onFocusModeChange })

  const openCharacterEditor = (characterId) => {
    setEditingCharacterId(characterId)
    setCharacterEditorOpen(true)
    setCharacterLibraryOpen(false)
  }

  const closeCharacterEditor = () => {
    setCharacterEditorOpen(false)
    setEditingCharacterId(null)
  }

  const openEnvironmentEditor = (environmentId) => {
    setEditingEnvironmentId(environmentId)
    setEnvironmentEditorOpen(true)
    setEnvironmentLibraryOpen(false)
  }

  const closeEnvironmentEditor = () => {
    setEnvironmentEditorOpen(false)
    setEditingEnvironmentId(null)
  }

  const openObjectEditor = (objectId) => {
    setEditingObjectId(objectId)
    setObjectEditorOpen(true)
    setObjectLibraryOpen(false)
  }

  const closeObjectEditor = () => {
    setObjectEditorOpen(false)
    setEditingObjectId(null)
  }

  const openApplyScopeModal = (config) => {
    setApplyScopeConfig(config)
    setApplyScopeModalOpen(true)
  }

  const closeApplyScopeModal = () => {
    setApplyScopeModalOpen(false)
    setApplyScopeConfig(null)
  }

  useEffect(() => {
    if (studioScenes?.length) {
      setActiveStudioProject({
        scenes: studioScenes,
        projectName,
        characters: projectCharacters,
        environments: projectEnvironments,
        objects: projectObjects,
      })
    }
    return () => setActiveStudioProject({ reset: true })
  }, [studioScenes, projectName, projectCharacters, projectEnvironments, projectObjects])

  useEffect(() => {
    const nextAssignments = initialShotAssignments ?? {}
    setShotAssignments(nextAssignments)
    setAssignmentTimestamps(createDefaultAssignmentTimestamps(Object.keys(nextAssignments)))
  }, [initialShotAssignments])

  useEffect(() => {
    if (firstShotId) setSelectedShotId(firstShotId)
  }, [firstShotId])

  useEffect(() => {
    if (!isActive && isFocusMode) {
      exitFocusMode()
    }
  }, [exitFocusMode, isActive, isFocusMode])

  const selectedShotMatch = useMemo(() => findShotById(selectedShotId), [selectedShotId])
  const selectedShot = selectedShotMatch?.shot
  const selectedShotDisplayId = selectedShot?.id ?? selectedShotId
  const selectedShotCharacters = useMemo(
    () => resolveShotCharacters(selectedShot, shotAssignments, projectCharacters),
    [selectedShot, shotAssignments, projectCharacters]
  )

  const handleEditShot = () => {
    setActiveRightTab('Edit')
    if (isFocusMode) {
      setShowRightPanel(true)
    }
  }

  const handleReassignAssets = async () => {
    if (!onReassignAssets) return null

    const next = await onReassignAssets()
    const nextAssignments = next?.shotAssignments ?? {}

    if (Object.keys(nextAssignments).length > 0) {
      setShotAssignments(nextAssignments)
      setAssignmentTimestamps(createDefaultAssignmentTimestamps(Object.keys(nextAssignments)))
    }

    return next
  }

  const handleRefreshAssignments = async () => {
    if (!onRefreshAssignments) return null

    const next = await onRefreshAssignments()
    const nextAssignments = next?.shotAssignments ?? {}

    setShotAssignments(nextAssignments)
    setAssignmentTimestamps(createDefaultAssignmentTimestamps(Object.keys(nextAssignments)))

    return next
  }

  const selectionModeActive = activeCanvasTool === 'selectAssets'
  const selectableRegions = useMemo(
    () => getSelectableRegions(selectedShotDisplayId),
    [selectedShotDisplayId]
  )
  const selectedRegion = selectedRegionId
    ? findSelectableRegion(selectedShotDisplayId, selectedRegionId)
    : null

  useEffect(() => {
    setSelectedRegionId(null)
  }, [selectedShotId])

  useEffect(() => {
    if (!selectionModeActive) {
      setSelectedRegionId(null)
    }
  }, [selectionModeActive])

  const handleCanvasToolChange = (toolId) => {
    setActiveCanvasTool(toolId)
  }

  const handleUpdateShotReviewStatus = async (shotKey, reviewStatus) => {
    if (!onUpdateShotReviewStatus) return

    setSavingReviewStatus(true)
    try {
      await onUpdateShotReviewStatus(shotKey, reviewStatus)
    } finally {
      setSavingReviewStatus(false)
    }
  }

  const handleRegenerateShot = async (shotApiId) => {
    const result = await onRegenerateShot(shotApiId)

    if (result?.requiresSelection) {
      setCandidateSelectionError(null)
      setCandidateSelection({
        shotApiId: result.shotApiId,
        candidates: result.candidates,
      })
    }

    return result
  }

  const handleCloseCandidateSelection = () => {
    if (selectingShotCandidateId || regeneratingCandidateOptions) return
    setCandidateSelection(null)
    setCandidateSelectionError(null)
  }

  const handleRegenerateCandidateOptions = async () => {
    if (!candidateSelection?.shotApiId || !onRegenerateShotCandidates) return

    setRegeneratingCandidateOptions(true)
    setCandidateSelectionError(null)

    try {
      const candidates = await onRegenerateShotCandidates(candidateSelection.shotApiId)
      setCandidateSelection((current) =>
        current ? { ...current, candidates } : current
      )
    } catch {
      setCandidateSelectionError('Could not regenerate options. Please try again.')
    } finally {
      setRegeneratingCandidateOptions(false)
    }
  }

  const handleSelectCandidate = async (candidateId) => {
    if (!candidateSelection?.shotApiId || !onSelectShotCandidate) return

    setCandidateSelectionError(null)

    try {
      await onSelectShotCandidate(candidateSelection.shotApiId, candidateId)
      setCandidateSelection(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Shot version selection failed'
      setCandidateSelectionError(message)
    }
  }

  return (
    <div className={`${styles.studio} ${isFocusMode ? styles.studioFocus : ''}`}>
      {!isFocusMode && <TopBar onEnterFocusMode={enterFocusMode} onBackToStory={onBackToStory} />}
      <div className={styles.workspace}>
        {(!isFocusMode || showLeftPanel) && (
        <LeftSidebar
          selectedShotId={selectedShotId}
          onSelectShot={setSelectedShotId}
          onOpenCharacterLibrary={() => setCharacterLibraryOpen(true)}
          onOpenEnvironmentLibrary={() => setEnvironmentLibraryOpen(true)}
          onOpenObjectLibrary={() => setObjectLibraryOpen(true)}
          generatingSceneIds={generatingSceneIds}
          onGenerateSceneImages={onGenerateSceneImages}
        />
        )}
        <main className={styles.center}>
          <CanvasPreview
            selectedShotId={selectedShotId}
            activeCanvasTool={activeCanvasTool}
            onCanvasToolChange={handleCanvasToolChange}
            selectionModeActive={selectionModeActive}
            selectableRegions={selectableRegions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            selectedRegion={selectedRegion}
            regeneratingShotApiId={regeneratingShotApiId}
            generatingSceneIds={generatingSceneIds}
            onRegenerateShot={handleRegenerateShot}
            onEditShot={handleEditShot}
            showShotCaptions={showShotCaptions}
            shotAssignments={shotAssignments}
            assignedCharacters={selectedShotCharacters}
            isFocusMode={isFocusMode}
            onEnterFocusMode={enterFocusMode}
            onUpdateShotReviewStatus={handleUpdateShotReviewStatus}
            savingReviewStatus={savingReviewStatus}
          />
          <Timeline
            selectedShotId={selectedShotId}
            onSelectShot={setSelectedShotId}
            regeneratingShotApiId={regeneratingShotApiId}
            selectingShotCandidateId={selectingShotCandidateId}
            generatingSceneIds={generatingSceneIds}
            navigationEnabled={isActive}
            showShotCaptions={showShotCaptions}
            onShowShotCaptionsChange={setShowShotCaptions}
            shotAssignments={shotAssignments}
            compact={isFocusMode}
          />
        </main>
        {(!isFocusMode || showRightPanel) && (
        <RightPanel
          selectedShotId={selectedShotId}
          activeTab={activeRightTab}
          onTabChange={setActiveRightTab}
          shotAssignments={shotAssignments}
          assignmentTimestamps={assignmentTimestamps}
          selectedRegion={selectedRegion}
          onEditCharacter={(characterId) => openCharacterEditor(characterId)}
          onEditEnvironment={(environmentId) => openEnvironmentEditor(environmentId)}
          onEditObject={(objectId) => openObjectEditor(objectId)}
          onOpenApplyScopeModal={openApplyScopeModal}
          regeneratingShotApiId={regeneratingShotApiId}
          onSaveShot={onSaveShot}
          projectCharacters={projectCharacters}
          projectEnvironments={projectEnvironments}
          projectObjects={projectObjects}
          onReassignAssets={handleReassignAssets}
          onRefreshAssignments={handleRefreshAssignments}
          onUpdateShotReviewStatus={handleUpdateShotReviewStatus}
          savingReviewStatus={savingReviewStatus}
          compact={isFocusMode}
        />
        )}
      </div>
      {!isFocusMode && <StatusBar />}
      {isFocusMode && (
        <FocusModeControls
          showRightPanel={showRightPanel}
          onToggleRightPanel={() => setShowRightPanel((open) => !open)}
          onExit={exitFocusMode}
          onBackToStory={onBackToStory}
        />
      )}
      <CharacterLibraryModal
        open={characterLibraryOpen}
        onClose={() => setCharacterLibraryOpen(false)}
        onOpenCharacterEditor={openCharacterEditor}
      />
      <EnvironmentLibraryModal
        open={environmentLibraryOpen}
        onClose={() => setEnvironmentLibraryOpen(false)}
        onOpenEnvironmentEditor={openEnvironmentEditor}
      />
      <ObjectLibraryModal
        open={objectLibraryOpen}
        onClose={() => setObjectLibraryOpen(false)}
        onOpenObjectEditor={openObjectEditor}
      />
      <CharacterEditorStudio
        open={characterEditorOpen}
        characterId={editingCharacterId}
        selectedShotId={selectedShotDisplayId}
        onClose={closeCharacterEditor}
        onOpenApplyScopeModal={openApplyScopeModal}
      />
      <EnvironmentEditorStudio
        open={environmentEditorOpen}
        environmentId={editingEnvironmentId}
        selectedShotId={selectedShotDisplayId}
        onClose={closeEnvironmentEditor}
        onOpenApplyScopeModal={openApplyScopeModal}
      />
      <ObjectEditorStudio
        open={objectEditorOpen}
        objectId={editingObjectId}
        selectedShotId={selectedShotDisplayId}
        onClose={closeObjectEditor}
        onOpenApplyScopeModal={openApplyScopeModal}
      />
      <ApplyScopeModal
        open={applyScopeModalOpen}
        config={applyScopeConfig}
        onClose={closeApplyScopeModal}
        onApply={closeApplyScopeModal}
      />
      <ShotCandidateSelectionModal
        open={Boolean(candidateSelection)}
        candidates={candidateSelection?.candidates ?? []}
        onClose={handleCloseCandidateSelection}
        onSelect={handleSelectCandidate}
        onRegenerateOptions={onRegenerateShotCandidates ? handleRegenerateCandidateOptions : undefined}
        selecting={Boolean(selectingShotCandidateId)}
        regeneratingOptions={regeneratingCandidateOptions}
        error={candidateSelectionError}
      />
    </div>
  )
}
