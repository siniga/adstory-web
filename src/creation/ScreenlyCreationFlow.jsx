import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getVisualStyleLabel } from '../config/visualStyles'
import CreationActionBar from './components/CreationActionBar'
import CreationStepper from './components/CreationStepper'
import CharactersStep from './components/CharactersStep'
import EnvironmentsStep from './components/EnvironmentsStep'
import SceneboardStep from './components/sceneboard/SceneboardStep'
import ScreenplayStep from './components/ScreenplayStep'
import ScriptStep from './components/ScriptStep'
import StoryStep from './components/StoryStep'
import { CREATION_STEPS, getStepIndex } from './creationData'
import {
  allCharactersPortraitComplete,
  areCharactersGenerationSettled,
  hasProjectCharacters,
  logCharactersUpdate,
  mergeCharacterListsPreservingPortraits,
  normalizeCharacterList,
} from './characterGenerationStatus'
import { areEnvironmentsGenerationSettled, mergeEnvironmentListsPreservingImages, normalizeEnvironmentList } from './environmentGenerationStatus'
import { projectStepPath, projectStoryboardPath, projectStudioPath } from '../routes/paths'
import { loadProject } from '../project/projectStorage'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import ErrorModal from '../app/components/ErrorModal'
import styles from './ScreenlyCreationFlow.module.css'

const STEP_PIPELINE = {
  story: 'script',
  script: 'screenplay',
  screenplay: 'sceneboard',
}

const AUTO_PIPELINE_STEPS = []

function stepHasGeneratedOutput(stepId, project) {
  switch (stepId) {
    case 'script':
      return Boolean(project.screenplay?.trim())
    case 'screenplay':
      return (project.scenes?.length ?? 0) > 0
    default:
      return false
  }
}

function getAutoContinuePayload(stepId, project) {
  switch (stepId) {
    case 'script':
      return { script: project.script }
    case 'screenplay':
      return { screenplay: project.screenplay }
    default:
      return undefined
  }
}

function currentStepIsReady(stepId, project) {
  switch (stepId) {
    case 'script':
      return Boolean(project.script?.trim())
    case 'screenplay':
      return Boolean(project.screenplay?.trim())
    default:
      return false
  }
}

export default function ScreenlyCreationFlow({
  projectState,
  projectStore,
  currentStep,
  maxStepIndex,
  onOpenStoryboard,
}) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const processedAutoContinueKey = useRef(null)
  const [stepAction, setStepAction] = useState(null)
  const [shotsError, setShotsError] = useState(null)
  const [charactersError, setCharactersError] = useState(null)
  const [storySaveError, setStorySaveError] = useState(null)
  const [storySaveStatus, setStorySaveStatus] = useState('idle')
  const [scriptSaveStatus, setScriptSaveStatus] = useState('idle')
  const [scriptSaveError, setScriptSaveError] = useState(null)
  const [screenplaySaveStatus, setScreenplaySaveStatus] = useState('idle')
  const [screenplaySaveError, setScreenplaySaveError] = useState(null)
  const [scenesSaveStatus, setScenesSaveStatus] = useState('idle')
  const [scenesSaveError, setScenesSaveError] = useState(null)
  const [scriptForStep, setScriptForStep] = useState('')
  const [screenplayForStep, setScreenplayForStep] = useState('')
  const navScriptOnEnterRef = useRef(undefined)
  const navScreenplayOnEnterRef = useRef(undefined)
  const navCharactersOnEnterRef = useRef(undefined)
  const navEnvironmentsOnEnterRef = useRef(undefined)
  const stepEnterKeyRef = useRef(null)
  const [shotsSaveStatus, setShotsSaveStatus] = useState('idle')
  const [shotsSaveError, setShotsSaveError] = useState(null)
  const [shotsLoadError, setShotsLoadError] = useState(null)
  const [charactersSaveStatus, setCharactersSaveStatus] = useState('idle')
  const [charactersSaveError, setCharactersSaveError] = useState(null)
  const [charactersLoadError, setCharactersLoadError] = useState(null)
  const [environmentsLoadError, setEnvironmentsLoadError] = useState(null)
  const [environmentsSaveStatus, setEnvironmentsSaveStatus] = useState('idle')
  const [environmentsSaveError, setEnvironmentsSaveError] = useState(null)
  const [stepContentLoadingLocal, setStepContentLoadingLocal] = useState(false)
  const {
    generating,
    error,
    clearError,
    updateStory,
    saveStoryToBackend,
    saveScriptToBackend,
    saveScreenplayToBackend,
    saveScenesToBackend,
    saveShotsToBackend,
    saveCharactersToBackend,
    saveEnvironmentsToBackend,
    updateVisualStyle,
    runStep,
    persist,
    completeCharactersStep,
    completeEnvironmentsStep,
  } = projectState

  const {
    project: storeProject,
    characters: storeCharacters,
    environments: storeEnvironments,
    loading: storeLoading,
    loadProject: loadProjectIntoStore,
    loadSceneboard,
    mergeCharacters,
    mergeEnvironments,
    setCharacters: setStoreCharacters,
    setEnvironments: setStoreEnvironments,
    refreshFullProject,
  } = projectStore

  const project = storeProject
  const currentIndex = getStepIndex(currentStep)
  const displayStyle = useMemo(
    () => getVisualStyleLabel(project.visualStyle) || location.state?.style || '',
    [location.state?.style, project.visualStyle]
  )
  const displayScript = currentStep === 'script' ? scriptForStep : (project.script ?? '')
  const displayScreenplay =
    currentStep === 'screenplay' ? screenplayForStep : (project.screenplay ?? '')
  const combinedStepLoading = storeLoading || stepContentLoadingLocal

  const reportStepLoadError = useCallback((err) => {
    const raw = err instanceof Error ? err.message : 'Failed to load saved project'
    if (currentStep === 'story') {
      setStorySaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (currentStep === 'script') {
      setScriptSaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (currentStep === 'screenplay') {
      setScreenplaySaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (currentStep === 'sceneboard') {
      setScenesSaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (currentStep === 'characters') {
      setCharactersLoadError(formatUserFriendlyError(raw).message)
      return
    }
    if (currentStep === 'environments') {
      setEnvironmentsLoadError(formatUserFriendlyError(raw).message)
    }
  }, [currentStep])

  useEffect(() => {
    stepEnterKeyRef.current = null
  }, [projectId])

  useEffect(() => {
    setCharactersError(null)
  }, [currentStep])

  useEffect(() => {
    if (
      !['story', 'script', 'screenplay', 'sceneboard', 'characters', 'environments'].includes(
        currentStep
      )
    ) {
      return undefined
    }

    navScriptOnEnterRef.current = location.state?.script
    navScreenplayOnEnterRef.current = location.state?.screenplay
    navCharactersOnEnterRef.current = location.state?.characters
    navEnvironmentsOnEnterRef.current = location.state?.environments

    const id = projectId
    if (!id) {
      return undefined
    }

    const enterKey = `${id}:${currentStep}`
    if (stepEnterKeyRef.current === enterKey) {
      return undefined
    }
    stepEnterKeyRef.current = enterKey

    if (currentStep === 'story') setStorySaveError(null)
    if (currentStep === 'script') setScriptSaveError(null)
    if (currentStep === 'screenplay') setScreenplaySaveError(null)
    if (currentStep === 'sceneboard') setScenesSaveError(null)
    if (currentStep === 'characters') setCharactersLoadError(null)
    if (currentStep === 'environments') setEnvironmentsLoadError(null)

    if (currentStep === 'script') {
      const cached = loadProject()
      const script = cached.script?.trim()
        ? cached.script
        : (navScriptOnEnterRef.current ?? '')
      setScriptForStep(script)
    }

    if (currentStep === 'screenplay') {
      const cached = loadProject()
      const screenplay = cached.screenplay?.trim()
        ? cached.screenplay
        : (navScreenplayOnEnterRef.current ?? '')
      setScreenplayForStep(screenplay)
    }

    if (currentStep === 'characters') {
      const fallback = normalizeCharacterList(navCharactersOnEnterRef.current ?? [])
      if (fallback.length) {
        mergeCharacters(fallback)
      }
    }

    if (currentStep === 'environments') {
      const fallback = normalizeEnvironmentList(navEnvironmentsOnEnterRef.current ?? [])
      if (fallback.length) {
        mergeEnvironments(fallback)
      }
    }

    return undefined
  }, [currentStep, projectId, mergeCharacters, mergeEnvironments])

  const advanceToStep = useCallback(
    (nextStepId, { autoContinue = false, navigationState = {} } = {}) => {
      navigate(projectStepPath(projectId, nextStepId), {
        state: {
          stepUnlock: nextStepId,
          autoContinue,
          ...navigationState,
        },
      })
    },
    [navigate, projectId]
  )

  const goNext = useCallback(
    async (payload) => {
      const pipelineStep = STEP_PIPELINE[currentStep]
      const isPlainPayload =
        payload &&
        typeof payload === 'object' &&
        !('nativeEvent' in payload) &&
        !(payload.target instanceof HTMLElement)
      const snapshot = isPlainPayload ? { ...project, ...payload } : project

      try {
        let stepResult
        let workingSnapshot = snapshot

        if (currentStep === 'story') {
          setStorySaveError(null)
          setStorySaveStatus('saving')
          const trimmedStory = workingSnapshot.story?.trim() ?? ''
          workingSnapshot = await saveStoryToBackend({
            story: trimmedStory,
            visualStyle: workingSnapshot.visualStyle,
            title: workingSnapshot.name,
          })
          setStorySaveStatus('saved')
        }

        if (currentStep === 'script') {
          setScriptSaveError(null)
          setScriptSaveStatus('saving')
          workingSnapshot = await saveScriptToBackend({
            script: workingSnapshot.script?.trim() ?? '',
          })
          setScriptSaveStatus('saved')
        }

        if (pipelineStep) {
          stepResult = await runStep(pipelineStep, workingSnapshot)
        } else if (isPlainPayload) {
          persist(snapshot)
        }

        if (currentStep === 'shots') {
          advanceToStep('characters', { autoContinue: true })
          return
        }

        const nextIndex = currentIndex + 1
        const nextStepId = CREATION_STEPS[nextIndex]?.id
        if (nextIndex < CREATION_STEPS.length && nextStepId) {
          let navigationState = {}
          let autoContinue = true

          if (currentStep === 'story' && stepResult?.script) {
            navigationState = {
              script: stepResult.script,
              style: getVisualStyleLabel(workingSnapshot.visualStyle),
            }
            autoContinue = false
          }

          if (currentStep === 'script' && stepResult?.screenplay) {
            navigationState = {
              screenplay: stepResult.screenplay,
              script: stepResult.script ?? workingSnapshot.script?.trim(),
              style: workingSnapshot.style ?? getVisualStyleLabel(workingSnapshot.visualStyle),
            }
            autoContinue = false
          }

          if (currentStep === 'screenplay' && stepResult?.scenes) {
            navigationState = {
              scenes: stepResult.scenes,
              screenplay: stepResult.screenplay ?? workingSnapshot.screenplay?.trim(),
              style: workingSnapshot.style ?? getVisualStyleLabel(workingSnapshot.visualStyle),
            }
            autoContinue = false
          }

          if (currentStep === 'scenes' && stepResult?.shotGroups) {
            navigationState = {
              scenes: stepResult.scenes ?? workingSnapshot.scenes,
              shots: stepResult.shotGroups,
              style: workingSnapshot.style ?? getVisualStyleLabel(workingSnapshot.visualStyle),
            }
            autoContinue = false
          }

          advanceToStep(nextStepId, { autoContinue, navigationState })
        }
      } catch (err) {
        if (currentStep === 'story') {
          setStorySaveStatus('idle')
          const message = formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to save story'
          ).message
          setStorySaveError(message)
        }
        if (currentStep === 'script') {
          setScriptSaveStatus('idle')
          const message = formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to save script'
          ).message
          setScriptSaveError(message)
        }
        // Error message is shown via projectState.error or step save errors
      }
    },
    [
      advanceToStep,
      currentIndex,
      currentStep,
      persist,
      project,
      runStep,
      saveScriptToBackend,
      saveStoryToBackend,
    ]
  )

  const handleSaveScript = useCallback(
    async (script) => {
      setScriptSaveError(null)
      setScriptSaveStatus('saving')
      try {
        await saveScriptToBackend({ script })
        setScriptForStep(script)
        setScriptSaveStatus('saved')
      } catch (err) {
        setScriptSaveStatus('idle')
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to save script'
        ).message
        setScriptSaveError(message)
      }
    },
    [saveScriptToBackend]
  )

  const handleSaveScreenplay = useCallback(
    async (screenplay) => {
      setScreenplaySaveError(null)
      setScreenplaySaveStatus('saving')
      try {
        await saveScreenplayToBackend({ screenplay })
        setScreenplayForStep(screenplay)
        setScreenplaySaveStatus('saved')
      } catch (err) {
        setScreenplaySaveStatus('idle')
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to save screenplay'
        ).message
        setScreenplaySaveError(message)
      }
    },
    [saveScreenplayToBackend]
  )

  useEffect(() => {
    const { stepUnlock, autoContinue } = location.state ?? {}
    if (!autoContinue || stepUnlock !== currentStep) return
    if (generating) return
    if (!AUTO_PIPELINE_STEPS.includes(currentStep)) return
    if (!currentStepIsReady(currentStep, project)) return
    if (processedAutoContinueKey.current === location.key) return

    const runAutoContinue = async () => {
      if (currentStep === 'shots') {
        if (!stepHasGeneratedOutput('shots', project)) return

        processedAutoContinueKey.current = location.key
        advanceToStep('characters', { autoContinue: true })
        return
      }

      if (stepHasGeneratedOutput(currentStep, project)) {
        const nextStepId = CREATION_STEPS[currentIndex + 1]?.id
        if (!nextStepId) return

        processedAutoContinueKey.current = location.key
        advanceToStep(nextStepId, { autoContinue: true })
        return
      }

      processedAutoContinueKey.current = location.key
      await goNext(getAutoContinuePayload(currentStep, project))
    }

    runAutoContinue()
  }, [
    advanceToStep,
    currentIndex,
    currentStep,
    generating,
    goNext,
    location.key,
    location.state,
    project,
  ])

  const goToStep = (stepId) => {
    if (stepId === 'studio') {
      navigate(projectStudioPath(projectId))
      return
    }

    if (stepId === 'storyboard') {
      navigate(projectStoryboardPath(projectId))
      return
    }

    if (stepId === 'characters') {
      if (project.status?.sceneboard === 'done' || (project.scenes?.length ?? 0) > 0) {
        navigate(projectStepPath(projectId, 'characters'))
      }
      return
    }

    if (stepId === 'environments') {
      if (project.status?.characters === 'done' || (project.characters?.length ?? 0) > 0) {
        navigate(projectStepPath(projectId, 'environments'))
      }
      return
    }

    const index = getStepIndex(stepId)
    if (index <= maxStepIndex) {
      navigate(projectStepPath(projectId, stepId))
    }
  }

  const handleContinueToEnvironments = useCallback(async () => {
    console.log('[Characters] Continue clicked')
    setCharactersSaveError(null)

    try {
      const latestProject = await refreshFullProject('continue to environments')
      const latestCharacters = normalizeCharacterList(latestProject.characters ?? storeCharacters)

      if (!hasProjectCharacters(latestCharacters)) {
        setCharactersSaveError('Characters are not complete yet.')
        return
      }

      if (
        !allCharactersPortraitComplete(latestCharacters) &&
        !areCharactersGenerationSettled(latestCharacters) &&
        latestProject.characterGenerationStatus !== 'completed' &&
        latestProject.characterGenerationStatus !== 'completed_with_errors'
      ) {
        setCharactersSaveError('Character portraits are still generating.')
        return
      }

      const merged = mergeCharacters(latestCharacters)
      logCharactersUpdate('handleContinueToEnvironments', merged)

      persist({
        ...latestProject,
        characters: merged,
        status: {
          ...latestProject.status,
          characters: 'done',
        },
      })

      completeCharactersStep()

      navigate(projectStepPath(projectId, 'environments'), {
        state: {
          environments: latestProject.environments ?? storeEnvironments,
          characters: merged,
          stepUnlock: 'environments',
          style: displayStyle,
        },
      })
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to load project'
      ).message
      setCharactersSaveError(message)
      throw err
    }
  }, [
    completeCharactersStep,
    displayStyle,
    mergeCharacters,
    navigate,
    persist,
    projectId,
    refreshFullProject,
    storeCharacters,
    storeEnvironments,
  ])

  const handleSaveCharacters = useCallback(
    async (characters) => {
      setCharactersSaveError(null)
      setCharactersSaveStatus('saving')
      try {
        const result = await saveCharactersToBackend({ characters })
        const merged = mergeCharacterListsPreservingPortraits(characters, result.characters ?? [])
        logCharactersUpdate('handleSaveCharacters POST /characters', merged)
        setStoreCharacters(merged)
        setCharactersSaveStatus('saved')
      } catch (err) {
        setCharactersSaveStatus('idle')
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to save characters'
        ).message
        setCharactersSaveError(message)
      }
    },
    [saveCharactersToBackend, setStoreCharacters]
  )

  const handleSaveEnvironments = useCallback(
    async (environments) => {
      setEnvironmentsSaveError(null)
      setEnvironmentsSaveStatus('saving')
      try {
        const result = await saveEnvironmentsToBackend({ environments })
        const merged = mergeEnvironmentListsPreservingImages(
          environments,
          result.environments ?? []
        )
        setStoreEnvironments(merged)
        setEnvironmentsSaveStatus('saved')
      } catch (err) {
        setEnvironmentsSaveStatus('idle')
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to save environments'
        ).message
        setEnvironmentsSaveError(message)
        throw err
      }
    },
    [saveEnvironmentsToBackend, setStoreEnvironments]
  )

  const handleContinueToStoryboard = useCallback(
    async (environmentsOverride) => {
      const environments = environmentsOverride ?? storeEnvironments

      setEnvironmentsSaveError(null)
      setEnvironmentsSaveStatus('saving')

      try {
        const saved = await saveEnvironmentsToBackend({ environments })
        const latestProject = await refreshFullProject('continue to storyboard')
        const mergedEnvironments = mergeEnvironmentListsPreservingImages(
          environments,
          latestProject.environments ?? []
        )

        completeEnvironmentsStep()
        persist({
          ...latestProject,
          environments: mergedEnvironments,
          status: {
            ...latestProject.status,
            environments: 'done',
          },
        })
        setStoreEnvironments(mergedEnvironments)

        navigate(projectStoryboardPath(projectId))
        return saved
      } catch (err) {
        setEnvironmentsSaveStatus('idle')
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to continue to Storyboard'
        ).message
        setEnvironmentsSaveError(message)
        throw err
      } finally {
        setEnvironmentsSaveStatus('idle')
      }
    },
    [
      completeEnvironmentsStep,
      navigate,
      persist,
      projectId,
      refreshFullProject,
      saveEnvironmentsToBackend,
      setStoreEnvironments,
      storeEnvironments,
    ]
  )

  const handleBackToScript = useCallback(
    (editedScreenplay) => {
      persist({
        ...project,
        screenplay: editedScreenplay,
        script: displayScript,
        status: {
          ...project.status,
          screenplay: editedScreenplay?.trim() ? 'done' : project.status?.screenplay,
        },
      })

      navigate(projectStepPath(projectId, 'script'), {
        state: {
          script: displayScript,
          style: displayStyle,
        },
      })
    },
    [displayScript, displayStyle, navigate, persist, project, projectId]
  )

  const handleContinueToSceneboard = useCallback(
    async ({ screenplay: editedScreenplay, style }) => {
      try {
        setScreenplaySaveError(null)
        setScreenplaySaveStatus('saving')
        const savedSnapshot = await saveScreenplayToBackend({
          screenplay: editedScreenplay,
        })
        setScreenplaySaveStatus('saved')

        persist({
          ...savedSnapshot,
          screenplay: editedScreenplay,
          status: {
            ...savedSnapshot.status,
            screenplay: 'done',
          },
        })

        advanceToStep('sceneboard', {
          autoContinue: false,
          navigationState: {
            screenplay: editedScreenplay,
            script: displayScript,
            style: style ?? displayStyle,
          },
        })
      } catch (err) {
        setScreenplaySaveStatus('idle')
        const message = formatUserFriendlyError(
          err instanceof Error ? err.message : 'Failed to save screenplay'
        ).message
        setScreenplaySaveError(message)
      }
    },
    [advanceToStep, displayScript, displayStyle, persist, saveScreenplayToBackend]
  )

  const handleBackToScreenplay = useCallback(async () => {
    navigate(projectStepPath(projectId, 'screenplay'), {
      state: {
        screenplay: displayScreenplay,
        script: displayScript,
        style: displayStyle,
      },
    })
  }, [displayScreenplay, displayScript, displayStyle, navigate, projectId])

  const handleContinueToCharacters = useCallback(async () => {
    setScenesSaveError(null)

    try {
      const latestScenes = await loadSceneboard(projectId)

      if (!latestScenes.length) {
        setScenesSaveError('Add at least one scene before continuing.')
        return
      }

      persist({
        ...project,
        scenes: latestScenes,
        status: {
          ...project.status,
          sceneboard: 'done',
          scenes: 'done',
        },
      })

      navigate(projectStepPath(projectId, 'characters'), {
        state: {
          characters: storeCharacters,
          screenplay: displayScreenplay,
          script: displayScript,
          style: displayStyle,
          stepUnlock: 'characters',
        },
      })
    } catch (err) {
      const message = formatUserFriendlyError(
        err instanceof Error ? err.message : 'Failed to load project'
      ).message
      setScenesSaveError(message)
      throw err
    }
  }, [
    displayScreenplay,
    displayScript,
    displayStyle,
    loadSceneboard,
    navigate,
    persist,
    project,
    projectId,
    storeCharacters,
  ])

  const handleSceneGenerationMetaChange = useCallback(
    (meta) => {
      const current = loadProject()
      persist({
        ...current,
        ...meta,
        status: {
          ...current.status,
          sceneboard:
            meta.sceneGenerationStatus === 'completed' ||
            meta.sceneGenerationStatus === 'completed_with_errors'
              ? 'done'
              : meta.sceneGenerationStatus === 'running' ||
                  meta.sceneGenerationStatus === 'stalled'
                ? 'generating'
                : current.status?.sceneboard ?? 'idle',
        },
      })
    },
    [persist]
  )

  const handleCharacterGenerationMetaChange = useCallback(
    (meta) => {
      const localCharacters = storeCharacters
      const charactersDone =
        meta.characterGenerationStatus === 'completed' ||
        meta.characterGenerationStatus === 'completed_with_errors' ||
        (localCharacters.length > 0 && allCharactersPortraitComplete(localCharacters))

      persist({
        ...project,
        ...meta,
        characters: localCharacters,
        status: {
          ...project.status,
          characters: charactersDone
            ? 'done'
            : meta.characterGenerationStatus === 'running' ||
                meta.characterGenerationStatus === 'stalled'
              ? 'generating'
              : project.status?.characters ?? 'idle',
        },
      })
    },
    [persist, project, storeCharacters]
  )

  const handleEnvironmentGenerationMetaChange = useCallback(
    (meta) => {
      const localEnvironments = storeEnvironments
      const environmentsDone =
        meta.environmentGenerationStatus === 'completed' ||
        meta.environmentGenerationStatus === 'completed_with_errors' ||
        (localEnvironments.length > 0 && areEnvironmentsGenerationSettled(localEnvironments))

      persist({
        ...project,
        ...meta,
        environments: localEnvironments,
        status: {
          ...project.status,
          environments: environmentsDone
            ? 'done'
            : meta.environmentGenerationStatus === 'running' ||
                meta.environmentGenerationStatus === 'stalled' ||
                meta.environmentGenerationStatus === 'queued' ||
                meta.environmentGenerationStatus === 'generating'
              ? 'generating'
              : project.status?.environments ?? 'idle',
        },
      })
    },
    [persist, project, storeEnvironments]
  )

  const stepProgressPct = useMemo(() => {
    const idx = getStepIndex(currentStep)
    if (idx < 0) return 0
    return Math.round(((idx + 1) / CREATION_STEPS.length) * 100)
  }, [currentStep])

  const isAssetWorkspace =
    currentStep === 'characters' || currentStep === 'environments' || currentStep === 'sceneboard'

  return (
    <div className={styles.flow}>
      <ErrorModal
        open={Boolean(error) && currentStep !== 'sceneboard' && currentStep !== 'characters' && currentStep !== 'environments'}
        title={error?.title ?? 'Something went wrong'}
        message={error?.message ?? ''}
        onClose={clearError}
      />
      <CreationStepper
        currentStep={currentStep}
        maxStepIndex={maxStepIndex}
        onStepClick={goToStep}
      />
      <div className={styles.body}>
        <main className={`${styles.main} ${isAssetWorkspace ? styles.assetsPageShell : ''}`}>
          <div className={isAssetWorkspace ? undefined : styles.mainInner}>
          {currentStep === 'story' && (
            <StoryStep
              story={project.story}
              visualStyle={project.visualStyle}
              onStoryChange={updateStory}
              onVisualStyleChange={updateVisualStyle}
              onActionChange={setStepAction}
              onNext={goNext}
              generating={generating}
              saveError={storySaveError}
              saveStatus={storySaveStatus}
              loading={combinedStepLoading}
            />
          )}
          {currentStep === 'script' && (
            <ScriptStep
              script={displayScript}
              style={displayStyle}
              onActionChange={setStepAction}
              onNext={goNext}
              onSave={handleSaveScript}
              generating={generating}
              loading={combinedStepLoading}
              saveStatus={scriptSaveStatus}
              saveError={scriptSaveError}
            />
          )}
          {currentStep === 'screenplay' && (
            <ScreenplayStep
              screenplay={displayScreenplay}
              style={displayStyle}
              onActionChange={setStepAction}
              onBackToScript={handleBackToScript}
              onContinueToScenes={handleContinueToSceneboard}
              onSave={handleSaveScreenplay}
              generating={generating}
              loading={combinedStepLoading}
              saveStatus={screenplaySaveStatus}
              saveError={screenplaySaveError}
            />
          )}
          {currentStep === 'sceneboard' && (
            <SceneboardStep
              projectId={project.projectId}
              screenplay={displayScreenplay}
              sceneGenerationStatus={project.sceneGenerationStatus}
              sceneGenerationStartedAt={project.sceneGenerationStartedAt}
              onGenerationMetaChange={handleSceneGenerationMetaChange}
              onBack={handleBackToScreenplay}
              onContinueToCharacters={handleContinueToCharacters}
              loading={combinedStepLoading}
            />
          )}
          {currentStep === 'characters' && (
            <CharactersStep
              projectId={project.projectId}
              style={displayStyle}
              fallbackCharacters={location.state?.characters ?? []}
              characterGenerationStatus={project.characterGenerationStatus}
              characterGenerationStartedAt={project.characterGenerationStartedAt}
              onGenerationMetaChange={handleCharacterGenerationMetaChange}
              onSave={handleSaveCharacters}
              loading={combinedStepLoading}
              saveStatus={charactersSaveStatus}
              saveError={charactersSaveError ?? charactersLoadError}
              onBack={() =>
                navigate(projectStepPath(projectId, 'sceneboard'), {
                  state: {
                    screenplay: displayScreenplay,
                    script: displayScript,
                    style: displayStyle,
                  },
                })
              }
              onContinueToEnvironments={handleContinueToEnvironments}
              onActionChange={setStepAction}
            />
          )}
          {currentStep === 'environments' && (
            <EnvironmentsStep
              projectId={project.projectId}
              style={displayStyle}
              environmentGenerationStatus={project.environmentGenerationStatus}
              environmentGenerationStartedAt={project.environmentGenerationStartedAt}
              loading={combinedStepLoading}
              loadError={environmentsLoadError}
              saveStatus={environmentsSaveStatus}
              saveError={environmentsSaveError}
              onGenerationMetaChange={handleEnvironmentGenerationMetaChange}
              onSave={handleSaveEnvironments}
              onBackToCharacters={() => navigate(projectStepPath(projectId, 'characters'))}
              onContinueToStoryboard={handleContinueToStoryboard}
            />
          )}
          </div>
        </main>
      </div>
      {stepAction ? (
        <CreationActionBar
          action={stepAction}
          generating={generating}
          progressPct={stepProgressPct}
        />
      ) : null}
    </div>
  )
}
