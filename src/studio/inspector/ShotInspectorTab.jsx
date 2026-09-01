import { useEffect, useMemo, useState } from 'react'
import * as projectApi from '../../services/projectApi'
import { findShotById } from '../data'
import CharacterAssignmentSection from './CharacterAssignmentSection'
import CurrentShotSummary from './CurrentShotSummary'
import EnvironmentAssignmentSection from './EnvironmentAssignmentSection'
import InspectorCollapsibleSection from './InspectorCollapsibleSection'
import ObjectAssignmentSection from './ObjectAssignmentSection'
import PromptInputsSection from './PromptInputsSection'
import {
  resolveShotCharacters,
  resolveShotEnvironment,
  resolveShotObjects,
  shotHasAssignedAssets,
} from '../resolveShotAssets'
import SelectedAssetPanel from '../selection/SelectedAssetPanel'
import ShotCharacterSelectorModal from './ShotCharacterSelectorModal'
import ShotEnvironmentSelectorModal from './ShotEnvironmentSelectorModal'
import ShotGenerationReferencesSection from './ShotGenerationReferencesSection'
import ShotLookSection from './ShotLookSection'
import ShotObjectSelectorModal from './ShotObjectSelectorModal'
import ShotPromptModal from './ShotPromptModal'
import ShotRelationshipCard from './ShotRelationshipCard'
import ShotReviewControls from '../components/ShotReviewControls'
import { SHOT_REVIEW_STATUS } from '../shotReviewStatus'
import { shotHasGenerationReferences } from './shotGenerationReferences'
import styles from './ShotInspectorTab.module.css'

export default function ShotInspectorTab({
  shot,
  shotAssignments,
  assignmentTimestamps,
  projectCharacters = [],
  projectEnvironments = [],
  projectObjects = [],
  onReassignAssets,
  onAssignmentsRefresh,
  selectedRegion,
  onEditCharacter,
  onEditEnvironment,
  onEditObject,
  onUpdateShotReviewStatus,
  savingReviewStatus = false,
}) {
  const shotId = shot?.id
  const shotApiId = shot?.apiId
  const [characterModalOpen, setCharacterModalOpen] = useState(false)
  const [environmentModalOpen, setEnvironmentModalOpen] = useState(false)
  const [objectModalOpen, setObjectModalOpen] = useState(false)
  const [savingCharacters, setSavingCharacters] = useState(false)
  const [savingEnvironment, setSavingEnvironment] = useState(false)
  const [savingObjects, setSavingObjects] = useState(false)
  const [characterError, setCharacterError] = useState(null)
  const [environmentError, setEnvironmentError] = useState(null)
  const [objectError, setObjectError] = useState(null)
  const [assetActionError, setAssetActionError] = useState(null)
  const [removingCharacterId, setRemovingCharacterId] = useState(null)
  const [removingEnvironment, setRemovingEnvironment] = useState(false)
  const [removingObjectId, setRemovingObjectId] = useState(null)
  const [reassigning, setReassigning] = useState(false)
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [shotPrompt, setShotPrompt] = useState(shot?.prompt ?? '')
  const [rebuildingPrompt, setRebuildingPrompt] = useState(false)
  const [promptError, setPromptError] = useState(null)
  const [, setTick] = useState(0)

  const match = findShotById(shotId)

  const assignedCharacters = useMemo(
    () => resolveShotCharacters(shot, shotAssignments, projectCharacters),
    [shot, shotAssignments, projectCharacters]
  )

  const environment = useMemo(
    () => resolveShotEnvironment(shot, shotAssignments, projectEnvironments),
    [shot, shotAssignments, projectEnvironments]
  )

  const objects = useMemo(
    () => resolveShotObjects(shot, shotAssignments, projectObjects),
    [shot, shotAssignments, projectObjects]
  )

  const assignedCharacterIds = useMemo(
    () => assignedCharacters.map((character) => Number(character.id)),
    [assignedCharacters]
  )

  const assignedObjectIds = useMemo(
    () => objects.map((object) => Number(object.id)),
    [objects]
  )

  const hasAssignedAssets = shotHasAssignedAssets(shot, shotAssignments)
  const assetCount = assignedCharacters.length + (environment ? 1 : 0) + objects.length

  useEffect(() => {
    setShotPrompt(shot?.prompt ?? '')
    setPromptError(null)
  }, [shotId, shot?.prompt])

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const refreshShotAssets = async () => {
    await onAssignmentsRefresh?.()
  }

  const requireShotApiId = () => {
    if (shotApiId) return true
    setAssetActionError('Save this project before editing shot assets.')
    return false
  }

  const handleSaveCharacters = async (characterIds) => {
    if (!requireShotApiId()) return

    setSavingCharacters(true)
    setCharacterError(null)
    setAssetActionError(null)

    try {
      await projectApi.syncShotCharacters(shotApiId, characterIds)
      await refreshShotAssets()
      setCharacterModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save character assignments'
      setCharacterError(message)
    } finally {
      setSavingCharacters(false)
    }
  }

  const handleSaveEnvironment = async (environmentId) => {
    if (!requireShotApiId()) return

    setSavingEnvironment(true)
    setEnvironmentError(null)
    setAssetActionError(null)

    try {
      await projectApi.syncShotEnvironment(shotApiId, environmentId)
      await refreshShotAssets()
      setEnvironmentModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save environment assignment'
      setEnvironmentError(message)
    } finally {
      setSavingEnvironment(false)
    }
  }

  const handleSaveObjects = async (objectIds) => {
    if (!requireShotApiId()) return

    setSavingObjects(true)
    setObjectError(null)
    setAssetActionError(null)

    try {
      await projectApi.syncShotObjects(shotApiId, objectIds)
      await refreshShotAssets()
      setObjectModalOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save object assignments'
      setObjectError(message)
    } finally {
      setSavingObjects(false)
    }
  }

  const handleRemoveCharacter = async (characterId) => {
    if (!requireShotApiId()) return

    setRemovingCharacterId(Number(characterId))
    setAssetActionError(null)

    try {
      await projectApi.removeShotCharacter(shotApiId, characterId)
      await refreshShotAssets()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove character'
      setAssetActionError(message)
    } finally {
      setRemovingCharacterId(null)
    }
  }

  const handleRemoveEnvironment = async () => {
    if (!requireShotApiId()) return

    setRemovingEnvironment(true)
    setAssetActionError(null)

    try {
      await projectApi.removeShotEnvironment(shotApiId)
      await refreshShotAssets()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove environment'
      setAssetActionError(message)
    } finally {
      setRemovingEnvironment(false)
    }
  }

  const handleRemoveObject = async (objectId) => {
    if (!requireShotApiId()) return

    setRemovingObjectId(Number(objectId))
    setAssetActionError(null)

    try {
      await projectApi.removeShotObject(shotApiId, objectId)
      await refreshShotAssets()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove object'
      setAssetActionError(message)
    } finally {
      setRemovingObjectId(null)
    }
  }

  const handleReassignAssets = async () => {
    if (!onReassignAssets) return

    setReassigning(true)

    try {
      await onReassignAssets()
    } finally {
      setReassigning(false)
    }
  }

  const handleViewPrompt = () => {
    setPromptModalOpen(true)
  }

  const handleRebuildPrompt = async () => {
    if (!shotApiId) {
      setPromptError('Save this project before rebuilding prompts.')
      return
    }

    setRebuildingPrompt(true)
    setPromptError(null)

    try {
      const result = await projectApi.getShotPrompt(shotApiId)
      setShotPrompt(result.prompt ?? '')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to rebuild prompt'
      setPromptError(message)
    } finally {
      setRebuildingPrompt(false)
    }
  }

  const reviewTargetId = shot?.apiId ?? shotId

  const handleApproveShot = () => {
    if (!reviewTargetId || !onUpdateShotReviewStatus || savingReviewStatus) return
    onUpdateShotReviewStatus(reviewTargetId, SHOT_REVIEW_STATUS.APPROVED)
  }

  const handleNeedsRevision = () => {
    if (!reviewTargetId || !onUpdateShotReviewStatus || savingReviewStatus) return
    onUpdateShotReviewStatus(reviewTargetId, SHOT_REVIEW_STATUS.NEEDS_REVISION)
  }

  return (
    <div className={styles.inspector}>
      <InspectorCollapsibleSection title="Shot" defaultOpen>
        <CurrentShotSummary
          sceneId={match?.scene?.id}
          sceneTitle={match?.scene?.title}
          shotId={shotId}
          shotTitle={shot?.label}
          characterCount={assignedCharacters.length}
          environmentCount={environment ? 1 : 0}
          objectCount={objects.length}
          lastUpdatedAt={assignmentTimestamps[shotId]}
        />

        <p className={styles.assetNotice}>Changes will affect future prompt generation.</p>

        <ShotReviewControls
          reviewStatus={shot?.reviewStatus}
          onApprove={onUpdateShotReviewStatus ? handleApproveShot : undefined}
          onNeedsRevision={onUpdateShotReviewStatus ? handleNeedsRevision : undefined}
          saving={savingReviewStatus}
        />

        {assetActionError ? <p className={styles.error}>{assetActionError}</p> : null}

        {onReassignAssets ? (
          <button
            type="button"
            className={styles.reassignBtn}
            onClick={handleReassignAssets}
            disabled={reassigning}
          >
            {reassigning ? 'Reassigning…' : 'Reassign Assets'}
          </button>
        ) : null}

        {!hasAssignedAssets ? (
          <div className={styles.globalEmptyState}>
            <p className={styles.globalEmptyText}>No assets assigned yet.</p>
          </div>
        ) : null}

        <ShotRelationshipCard
          characterCount={assignedCharacters.length}
          environmentCount={environment ? 1 : 0}
          objectCount={objects.length}
        />
      </InspectorCollapsibleSection>

      <InspectorCollapsibleSection
        title="Assets"
        defaultOpen
        trailing={<span className={styles.sectionCount}>{assetCount}</span>}
      >
        <SelectedAssetPanel
          selectedRegion={selectedRegion}
          sceneId={match?.scene?.id}
          shotId={shotId}
          onEditCharacter={onEditCharacter}
          onEditEnvironment={onEditEnvironment}
          onEditObject={onEditObject}
        />

        <CharacterAssignmentSection
          characters={assignedCharacters}
          loading={false}
          onManageClick={() => {
            setCharacterError(null)
            setCharacterModalOpen(true)
          }}
          onRemoveCharacter={handleRemoveCharacter}
          removingCharacterId={removingCharacterId}
        />
        {characterError && !characterModalOpen ? (
          <p className={styles.error}>{characterError}</p>
        ) : null}

        <EnvironmentAssignmentSection
          environment={environment}
          onChangeClick={() => {
            setEnvironmentError(null)
            setEnvironmentModalOpen(true)
          }}
          onRemove={environment ? handleRemoveEnvironment : undefined}
          removing={removingEnvironment}
        />
        {environmentError && !environmentModalOpen ? (
          <p className={styles.error}>{environmentError}</p>
        ) : null}

        <ObjectAssignmentSection
          objects={objects}
          onManageClick={() => {
            setObjectError(null)
            setObjectModalOpen(true)
          }}
          onRemoveObject={handleRemoveObject}
          removingObjectId={removingObjectId}
        />
        {objectError && !objectModalOpen ? (
          <p className={styles.error}>{objectError}</p>
        ) : null}
      </InspectorCollapsibleSection>

      <InspectorCollapsibleSection title="Look" defaultOpen={false}>
        <ShotLookSection shot={shot} />
      </InspectorCollapsibleSection>

      <InspectorCollapsibleSection title="Prompt" defaultOpen={false}>
        <PromptInputsSection
          characters={assignedCharacters}
          environment={environment}
          objects={objects}
          onViewPrompt={handleViewPrompt}
          onRebuildPrompt={handleRebuildPrompt}
          rebuilding={rebuildingPrompt}
          error={promptError}
        />
      </InspectorCollapsibleSection>

      <InspectorCollapsibleSection
        title="Generation References"
        defaultOpen={shotHasGenerationReferences(shot)}
      >
        <ShotGenerationReferencesSection shot={shot} />
      </InspectorCollapsibleSection>

      <ShotCharacterSelectorModal
        open={characterModalOpen}
        projectCharacters={projectCharacters}
        initialSelectedIds={assignedCharacterIds}
        onClose={() => {
          if (!savingCharacters) setCharacterModalOpen(false)
        }}
        onSave={handleSaveCharacters}
        saving={savingCharacters}
        error={characterError}
      />

      <ShotEnvironmentSelectorModal
        open={environmentModalOpen}
        projectEnvironments={projectEnvironments}
        initialSelectedId={environment?.id ?? null}
        onClose={() => {
          if (!savingEnvironment) setEnvironmentModalOpen(false)
        }}
        onSave={handleSaveEnvironment}
        saving={savingEnvironment}
        error={environmentError}
      />

      <ShotObjectSelectorModal
        open={objectModalOpen}
        projectObjects={projectObjects}
        initialSelectedIds={assignedObjectIds}
        onClose={() => {
          if (!savingObjects) setObjectModalOpen(false)
        }}
        onSave={handleSaveObjects}
        saving={savingObjects}
        error={objectError}
      />

      <ShotPromptModal
        open={promptModalOpen}
        shotLabel={shot?.label ?? shotId}
        prompt={shotPrompt}
        onClose={() => setPromptModalOpen(false)}
      />
    </div>
  )
}
