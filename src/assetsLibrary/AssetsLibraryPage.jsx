import { useCallback, useMemo, useState } from 'react'
import * as screenlyApi from '../services/screenlyApi'
import {
  allCharactersGenerated,
  readCharacterGenerationStatus,
} from './assetGenerationStatus'
import CharacterWorkflowRow from './components/CharacterWorkflowRow'
import { useCharacterAssetWorkflow } from './useCharacterAssetWorkflow'
import AssetWorkflowFooter from './workflow/AssetWorkflowFooter'
import AssetWorkflowInfoCard from './workflow/AssetWorkflowInfoCard'
import AssetWorkflowLayout from './workflow/AssetWorkflowLayout'
import listStyles from './workflow/AssetWorkflowList.module.css'
import AssetWorkflowPageHeader from './workflow/AssetWorkflowPageHeader'
import styles from './AssetsLibraryPage.module.css'

function isRowGenerating(character, generatingIds) {
  if (generatingIds?.has(String(character.id))) {
    return true
  }

  return readCharacterGenerationStatus(character).tone === 'generating'
}

export default function AssetsLibraryPage({
  projectId,
  initialCharacters = [],
  projectDefaultEthnicity = null,
  currentStep = 'assetsLibrary',
  maxStepIndex = 0,
  onStepClick,
  onApproveAndContinue,
  onBackToStory,
  onReplaceCharacters,
  onReplaceCharacter,
  error = null,
}) {
  const [actionError, setActionError] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [rowError, setRowError] = useState(null)

  const handleReplaceCharacters = useCallback(
    (nextCharacters) => {
      if (onReplaceCharacters) {
        onReplaceCharacters(nextCharacters)
        return
      }

      for (const character of nextCharacters) {
        onReplaceCharacter?.(character)
      }
    },
    [onReplaceCharacter, onReplaceCharacters]
  )

  const workflow = useCharacterAssetWorkflow({
    projectId,
    initialCharacters,
    onReplaceCharacters: handleReplaceCharacters,
  })

  const characterCount = workflow.characters.length
  const canContinue = allCharactersGenerated(workflow.characters, {
    generatingIds: workflow.generatingIds,
    isBuildingAll: workflow.isBuildingAll,
  })

  const handleGenerateOne = useCallback(
    async (characterId) => {
      setRowError(null)

      try {
        await workflow.generateOne(characterId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate character'
        setRowError(message)
      }
    },
    [workflow]
  )

  const handleGenerateAll = useCallback(async () => {
    setRowError(null)

    try {
      await workflow.generateAll()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate characters'
      setRowError(message)
    }
  }, [workflow])

  const handleContinue = useCallback(async () => {
    if (!canContinue || !projectId) return

    setContinuing(true)
    setActionError(null)

    try {
      await screenlyApi.acceptAllCharacters(projectId)
      await onApproveAndContinue?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to continue to environments'
      setActionError(message)
    } finally {
      setContinuing(false)
    }
  }, [canContinue, onApproveAndContinue, projectId])

  const displayError = actionError || error || workflow.listError || workflow.buildError || rowError

  const listContent = useMemo(() => {
    if (workflow.loadingList) {
      return <p className={listStyles.loading}>Loading characters from your screenplay…</p>
    }

    if (!characterCount) {
      return <p className={listStyles.empty}>No characters were found in your screenplay yet.</p>
    }

    return (
      <div className={listStyles.list}>
        {workflow.characters.map((character, index) => (
          <CharacterWorkflowRow
            key={character.id ?? `character-${index}`}
            character={character}
            index={index}
            isGenerating={isRowGenerating(character, workflow.generatingIds)}
            isBuildingAll={workflow.isBuildingAll}
            projectDefaultEthnicity={projectDefaultEthnicity}
            onGenerate={handleGenerateOne}
          />
        ))}
      </div>
    )
  }, [characterCount, handleGenerateOne, projectDefaultEthnicity, workflow])

  return (
    <AssetWorkflowLayout
      currentStep={currentStep}
      maxStepIndex={maxStepIndex}
      onStepClick={onStepClick}
      footer={
        <AssetWorkflowFooter
          backLabel="Back"
          onBack={onBackToStory}
          continueLabel="Continue to Environments"
          onContinue={handleContinue}
          continueDisabled={!canContinue}
          continueLoading={continuing}
        />
      }
    >
      {displayError ? (
        <div className={styles.errorBanner}>
          <p>{displayError}</p>
          {workflow.buildError ? (
            <button
              type="button"
              className={styles.retryBtn}
              onClick={workflow.retryBuild}
              disabled={workflow.isBuildingAll}
            >
              Retry
            </button>
          ) : null}
        </div>
      ) : null}

      <AssetWorkflowPageHeader
        title={`We found ${characterCount} character${characterCount === 1 ? '' : 's'} in your screenplay`}
        description="Generate each character to create their identity assets. Once every character is ready, continue to environments."
        generateAllLabel="Generate All Characters"
        onGenerateAll={handleGenerateAll}
        generateAllDisabled={!characterCount || workflow.isBuildingAll}
        generateAllLoading={workflow.isBuildingAll}
      />

      {listContent}

      <AssetWorkflowInfoCard>
        Generated characters are saved automatically in your project library and will be available
        throughout Screenly.
      </AssetWorkflowInfoCard>
    </AssetWorkflowLayout>
  )
}
