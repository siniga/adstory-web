import { useCallback, useMemo, useState } from 'react'
import * as screenlyApi from '../services/screenlyApi'
import styles from '../assetsLibrary/AssetsLibraryPage.module.css'
import {
  allEnvironmentsGenerated,
  readEnvironmentGenerationStatus,
} from '../assetsLibrary/assetGenerationStatus'
import AssetWorkflowFooter from '../assetsLibrary/workflow/AssetWorkflowFooter'
import AssetWorkflowInfoCard from '../assetsLibrary/workflow/AssetWorkflowInfoCard'
import AssetWorkflowLayout from '../assetsLibrary/workflow/AssetWorkflowLayout'
import listStyles from '../assetsLibrary/workflow/AssetWorkflowList.module.css'
import AssetWorkflowPageHeader from '../assetsLibrary/workflow/AssetWorkflowPageHeader'
import EnvironmentWorkflowRow from './components/EnvironmentWorkflowRow'
import { useEnvironmentAssetWorkflow } from './useEnvironmentAssetWorkflow'

function isRowGenerating(environment, generatingIds) {
  if (generatingIds?.has(String(environment.id))) {
    return true
  }

  return readEnvironmentGenerationStatus(environment).tone === 'generating'
}

export default function EnvironmentsPage({
  projectId,
  initialEnvironments = [],
  currentStep = 'characters',
  maxStepIndex = 0,
  onStepClick,
  onReplaceEnvironments,
  onReplaceEnvironment,
  onApproveAndContinue,
  onBackToCharacters,
  error = null,
}) {
  const [actionError, setActionError] = useState(null)
  const [continuing, setContinuing] = useState(false)
  const [rowError, setRowError] = useState(null)

  const handleReplaceEnvironments = useCallback(
    (nextEnvironments) => {
      if (onReplaceEnvironments) {
        onReplaceEnvironments(nextEnvironments)
        return
      }

      for (const environment of nextEnvironments) {
        onReplaceEnvironment?.(environment)
      }
    },
    [onReplaceEnvironment, onReplaceEnvironments]
  )

  const workflow = useEnvironmentAssetWorkflow({
    projectId,
    initialEnvironments,
    onReplaceEnvironments: handleReplaceEnvironments,
  })

  const environmentCount = workflow.environments.length
  const canContinue = allEnvironmentsGenerated(workflow.environments, {
    generatingIds: workflow.generatingIds,
    isBuildingAll: workflow.isBuildingAll,
  })

  const handleGenerateOne = useCallback(
    async (environmentId) => {
      setRowError(null)

      try {
        await workflow.generateOne(environmentId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate environment'
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
      const message = err instanceof Error ? err.message : 'Failed to generate environments'
      setRowError(message)
    }
  }, [workflow])

  const handleContinue = useCallback(async () => {
    if (!canContinue || !projectId) return

    setContinuing(true)
    setActionError(null)

    try {
      await screenlyApi.acceptAllEnvironments(projectId)
      await onApproveAndContinue?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to continue'
      setActionError(message)
    } finally {
      setContinuing(false)
    }
  }, [canContinue, onApproveAndContinue, projectId])

  const displayError = actionError || error || workflow.listError || workflow.buildError || rowError

  const listContent = useMemo(() => {
    if (workflow.loadingList) {
      return <p className={listStyles.loading}>Loading environments from your screenplay…</p>
    }

    if (!environmentCount) {
      return <p className={listStyles.empty}>No environments were found in your screenplay yet.</p>
    }

    return (
      <div className={listStyles.list}>
        {workflow.environments.map((environment, index) => (
          <EnvironmentWorkflowRow
            key={environment.id ?? `environment-${index}`}
            environment={environment}
            index={index}
            isGenerating={isRowGenerating(environment, workflow.generatingIds)}
            isBuildingAll={workflow.isBuildingAll}
            onGenerate={handleGenerateOne}
          />
        ))}
      </div>
    )
  }, [environmentCount, handleGenerateOne, workflow])

  return (
    <AssetWorkflowLayout
      currentStep={currentStep}
      maxStepIndex={maxStepIndex}
      onStepClick={onStepClick}
      footer={
        <AssetWorkflowFooter
          backLabel="Back"
          onBack={onBackToCharacters}
          continueLabel="Continue"
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
        title={`We found ${environmentCount} environment${environmentCount === 1 ? '' : 's'} in your screenplay`}
        description="Generate each environment to create its visual reference. Once every environment is ready, continue to the next step."
        generateAllLabel="Generate All Environments"
        onGenerateAll={handleGenerateAll}
        generateAllDisabled={!environmentCount || workflow.isBuildingAll}
        generateAllLoading={workflow.isBuildingAll}
      />

      {listContent}

      <AssetWorkflowInfoCard>
        Generated environments are saved automatically in your project library and will be available
        throughout Screenly.
      </AssetWorkflowInfoCard>
    </AssetWorkflowLayout>
  )
}
