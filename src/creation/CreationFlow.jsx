import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getVisualStyleLabel } from '../config/visualStyles'
import CreationActionBar from './components/CreationActionBar'
import CharactersStep from './components/CharactersStep'
import EnvironmentsStep from './components/EnvironmentsStep'
import SceneboardStep from './components/sceneboard/SceneboardStep'
import ScreenplayStep from './components/ScreenplayStep'
import StoryStep from './components/StoryStep'
import { CREATION_STEPS, getStepIndex } from './creationData'
import {
  allCharactersPortraitComplete,
  logCharactersUpdate,
  mergeCharacterListsPreservingPortraits,
  normalizeCharacterList,
} from './characterGenerationStatus'
import { areEnvironmentsGenerationSettled, allEnvironmentsImageComplete, mergeEnvironmentListsPreservingImages, normalizeEnvironmentList } from './environmentGenerationStatus'
import { projectStepPath, projectStoryboardPath, projectStudioPath, stepFromPathname } from '../routes/paths'
import { loadProject } from '../project/projectStorage'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import ErrorModal from '../app/components/ErrorModal'
import styles from './CreationFlow.module.css'
import { ProjectGenerationProvider } from './projectGeneration/ProjectGenerationProvider'
import { runStoryToEnvironmentsPipeline } from './pipeline/runStoryToEnvironmentsPipeline'
import { markUnifiedPipelineStoryboardDone } from '../storyboard/pipeline/runStoryboardGenerationPipeline'
import { MIN_SCREENPLAY_LENGTH } from '../services/adstoryApi'
import { storyNeedsEpisodes, storyTooLongMessage } from '../services/storyLength'

const STEP_PIPELINE = {
  screenplay: 'scenes',
}

const AUTO_PIPELINE_STEPS = []

function stepHasGeneratedOutput(stepId, project) {
  switch (stepId) {
    case 'screenplay':
      return (project.scenes?.length ?? 0) > 0
    default:
      return false
  }
}

function getAutoContinuePayload(stepId, project) {
  switch (stepId) {
    case 'screenplay':
      return { screenplay: project.screenplay }
    default:
      return undefined
  }
}

function currentStepIsReady(stepId, project) {
  switch (stepId) {
    case 'screenplay':
      return Boolean(project.screenplay?.trim())
    default:
      return false
  }
}

export default function CreationFlow({
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
  const [screenplaySaveStatus, setScreenplaySaveStatus] = useState('idle')
  const [screenplaySaveError, setScreenplaySaveError] = useState(null)
  const [scenesSaveStatus, setScenesSaveStatus] = useState('idle')
  const [scenesSaveError, setScenesSaveError] = useState(null)
  const [screenplayForStep, setScreenplayForStep] = useState('')
  const [screenplayForSceneboard, setScreenplayForSceneboard] = useState('')
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
  const [pipelineOpen, setPipelineOpen] = useState(false)
  const pipelineAbortRef = useRef(null)
  const pipelineRunningRef = useRef(false)
  const sceneMetaRef = useRef(null)
  const characterMetaRef = useRef(null)
  const environmentMetaRef = useRef(null)
  const {
    generating,
    error,
    clearError,
    updateStory,
    saveStoryToBackend,
    saveScreenplayToBackend,
    saveScenesToBackend,
    saveShotsToBackend,
    saveCharactersToBackend,
    saveEnvironmentsToBackend,
    runStep,
    persist,
    completeCharactersStep,
    completeEnvironmentsStep,
  } = projectState

  const {
    project: storeProject,
    characters: storeCharacters,
    environments: storeEnvironments,
    scenes: storeScenes,
    loading: storeLoading,
    loadProject: loadProjectIntoStore,
    loadSceneboard,
    mergeCharacters,
    mergeEnvironments,
    setCharacters: setStoreCharacters,
    setEnvironments: setStoreEnvironments,
    setScenes: setStoreScenes,
    refreshFullProject,
  } = projectStore

  const project = storeProject
  const activeStep = stepFromPathname(location.pathname) ?? currentStep
  const currentIndex = getStepIndex(activeStep)
  const effectiveMaxStepIndex = Math.max(maxStepIndex, currentIndex)
  const displayStyle = useMemo(
    () => getVisualStyleLabel(project.visualStyle) || location.state?.style || '',
    [location.state?.style, project.visualStyle]
  )
  const displayScreenplay =
    activeStep === 'screenplay'
      ? screenplayForStep
      : activeStep === 'sceneboard'
        ? (location.state?.screenplay ?? screenplayForSceneboard ?? project.screenplay ?? '')
        : (location.state?.screenplay ?? project.screenplay ?? '')
  const combinedStepLoading = storeLoading || stepContentLoadingLocal

  const reportStepLoadError = useCallback((err) => {
    const raw = err instanceof Error ? err.message : 'Failed to load saved project'
    if (activeStep === 'story') {
      setStorySaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (activeStep === 'screenplay') {
      setScreenplaySaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (activeStep === 'sceneboard') {
      setScenesSaveError(formatUserFriendlyError(raw).message)
      return
    }
    if (activeStep === 'characters') {
      setCharactersLoadError(formatUserFriendlyError(raw).message)
      return
    }
    if (activeStep === 'environments') {
      setEnvironmentsLoadError(formatUserFriendlyError(raw).message)
    }
  }, [activeStep])

  useEffect(() => {
    stepEnterKeyRef.current = null
  }, [projectId])

  useEffect(() => {
    setCharactersError(null)
  }, [activeStep])

  useEffect(() => {
    if (
      !['story', 'screenplay', 'sceneboard', 'characters', 'environments'].includes(
        activeStep
      )
    ) {
      return undefined
    }

    navScreenplayOnEnterRef.current = location.state?.screenplay
    navCharactersOnEnterRef.current = location.state?.characters
    navEnvironmentsOnEnterRef.current = location.state?.environments

    const id = projectId
    if (!id) {
      return undefined
    }

    const enterKey = `${id}:${activeStep}`
    if (stepEnterKeyRef.current === enterKey) {
      return undefined
    }
    stepEnterKeyRef.current = enterKey

    if (activeStep === 'story') setStorySaveError(null)
    if (activeStep === 'screenplay') setScreenplaySaveError(null)
    if (activeStep === 'sceneboard') setScenesSaveError(null)
    if (activeStep === 'characters') setCharactersLoadError(null)
    if (activeStep === 'environments') setEnvironmentsLoadError(null)

    if (activeStep === 'screenplay') {
      const cached = loadProject()
      const screenplay = cached.screenplay?.trim()
        ? cached.screenplay
        : (navScreenplayOnEnterRef.current ?? '')
      setScreenplayForStep(screenplay)
    }

    if (activeStep === 'sceneboard') {
      const cached = loadProject()
      const screenplay = cached.screenplay?.trim()
        ? cached.screenplay
        : (navScreenplayOnEnterRef.current ?? project.screenplay ?? '')
      setScreenplayForSceneboard(screenplay)
    }

    if (activeStep === 'characters') {
      const fallback = normalizeCharacterList(navCharactersOnEnterRef.current ?? [])
      if (fallback.length) {
        mergeCharacters(fallback)
      }
    }

    if (activeStep === 'environments') {
      const fallback = normalizeEnvironmentList(navEnvironmentsOnEnterRef.current ?? [])
      if (fallback.length) {
        mergeEnvironments(fallback)
      }
    }

    return undefined
  }, [activeStep, project.screenplay, projectId, mergeCharacters, mergeEnvironments])

  useEffect(() => {
    if (activeStep !== 'sceneboard' || screenplayForSceneboard.trim()) return
    if (project.screenplay?.trim()) {
      setScreenplayForSceneboard(project.screenplay)
    }
  }, [activeStep, project.screenplay, screenplayForSceneboard])

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
      const pipelineStep = STEP_PIPELINE[activeStep]
      const isPlainPayload =
        payload &&
        typeof payload === 'object' &&
        !('nativeEvent' in payload) &&
        !(payload.target instanceof HTMLElement)
      const snapshot = isPlainPayload ? { ...project, ...payload } : project

      // Story: run full Story → environments pipeline without a progress popup.
      if (activeStep === 'story') {
        if (pipelineRunningRef.current) return

        setStorySaveError(null)
        setStorySaveStatus('saving')
        setPipelineOpen(true)
        pipelineRunningRef.current = true

        const controller = new AbortController()
        pipelineAbortRef.current = controller

        try {
          const trimmedStory = snapshot.story?.trim() ?? ''
          if (storyNeedsEpisodes(trimmedStory)) {
            setPipelineOpen(false)
            pipelineRunningRef.current = false
            pipelineAbortRef.current = null
            setStorySaveStatus('idle')
            setStorySaveError(storyTooLongMessage(trimmedStory))
            return
          }
          const workingSnapshot = {
            ...snapshot,
            story: trimmedStory,
            name:
              snapshot.name ||
              trimmedStory.split(/[.!?]/)[0]?.trim().slice(0, 48) ||
              snapshot.name,
          }

          await runStoryToEnvironmentsPipeline({
            snapshot: workingSnapshot,
            saveStoryToBackend,
            runStep,
            styleLabel: getVisualStyleLabel(workingSnapshot.visualStyle),
            signal: controller.signal,
            onPhaseChange: () => {},
            onScenes: (scenes) => {
              if (Array.isArray(scenes)) setStoreScenes(scenes)
            },
            onCharacters: (characters) => {
              if (Array.isArray(characters) && characters.length > 0) {
                mergeCharacters(characters)
              }
            },
            onEnvironments: (environments) => {
              if (Array.isArray(environments) && environments.length > 0) {
                mergeEnvironments(environments)
              }
            },
            onSceneMeta: (meta) => sceneMetaRef.current?.(meta),
            onCharacterMeta: (meta) => characterMetaRef.current?.(meta),
            onEnvironmentMeta: (meta) => environmentMetaRef.current?.(meta),
          })

          setStorySaveStatus('saved')
          completeCharactersStep()
          completeEnvironmentsStep()
          markUnifiedPipelineStoryboardDone(projectId)
          setPipelineOpen(false)

          try {
            await refreshFullProject?.('pipeline complete', { slice: 'environments' })
          } catch {
            // Non-fatal — local state already has generated assets.
          }
        } catch (err) {
          if (err?.name === 'AbortError') {
            setPipelineOpen(false)
            return
          }

          setStorySaveStatus('idle')
          const friendly = formatUserFriendlyError(
            err instanceof Error ? err.message : 'Failed to generate project'
          )
          setPipelineOpen(false)
          setStorySaveError(friendly.message)
        } finally {
          pipelineRunningRef.current = false
          pipelineAbortRef.current = null
        }
        return
      }

      try {
        let stepResult
        let workingSnapshot = snapshot

        if (activeStep === 'screenplay') {
          setScreenplaySaveError(null)
          setScreenplaySaveStatus('saving')
          workingSnapshot = await saveScreenplayToBackend({
            screenplay: workingSnapshot.screenplay?.trim() ?? '',
          })
          setScreenplaySaveStatus('saved')
          setScreenplayForStep(workingSnapshot.screenplay?.trim() ?? '')
        }

        if (pipelineStep) {
          const existingScreenplay = workingSnapshot.screenplay?.trim() ?? ''
          const existingScenes =
            (workingSnapshot.scenes?.length ?? 0) > 0
              ? workingSnapshot.scenes
              : storeScenes

          if (
            pipelineStep === 'screenplay' &&
            existingScreenplay.length >= MIN_SCREENPLAY_LENGTH
          ) {
            stepResult = {
              ...workingSnapshot,
              screenplay: existingScreenplay,
            }
          } else if (
            (pipelineStep === 'sceneboard' || pipelineStep === 'scenes') &&
            (existingScenes?.length ?? 0) > 0
          ) {
            stepResult = {
              ...workingSnapshot,
              scenes: existingScenes,
            }
            setStoreScenes(existingScenes)
          } else {
            stepResult = await runStep(pipelineStep, workingSnapshot)
          }
        } else if (isPlainPayload) {
          persist(snapshot)
        }

        if (activeStep === 'shots') {
          advanceToStep('characters', { autoContinue: true })
          return
        }

        const nextIndex = currentIndex + 1
        const nextStepId = CREATION_STEPS[nextIndex]?.id
        if (nextIndex < CREATION_STEPS.length && nextStepId) {
          let navigationState = {}
          let autoContinue = true

          if (activeStep === 'screenplay' && stepResult?.scenes) {
            setStoreScenes(stepResult.scenes)
            navigationState = {
              scenes: stepResult.scenes,
              screenplay: stepResult.screenplay ?? workingSnapshot.screenplay?.trim(),
              style: workingSnapshot.style ?? getVisualStyleLabel(workingSnapshot.visualStyle),
            }
            autoContinue = false
          }

          if (activeStep === 'scenes' && stepResult?.shotGroups) {
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
        if (activeStep === 'screenplay') {
          setScreenplaySaveStatus('idle')
          setScreenplaySaveError(
            formatUserFriendlyError(
              err instanceof Error ? err.message : 'Failed to generate sequences'
            ).message
          )
        }
      }
    },
    [
      advanceToStep,
      completeCharactersStep,
      completeEnvironmentsStep,
      currentIndex,
      activeStep,
      mergeCharacters,
      mergeEnvironments,
      persist,
      project,
      refreshFullProject,
      runStep,
      saveScreenplayToBackend,
      saveStoryToBackend,
      setStoreScenes,
      storeScenes,
    ]
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
    if (!autoContinue || stepUnlock !== activeStep) return
    if (generating) return
    if (!AUTO_PIPELINE_STEPS.includes(activeStep)) return
    if (!currentStepIsReady(activeStep, project)) return
    if (processedAutoContinueKey.current === location.key) return

    const runAutoContinue = async () => {
      if (activeStep === 'shots') {
        if (!stepHasGeneratedOutput('shots', project)) return

        processedAutoContinueKey.current = location.key
        advanceToStep('characters', { autoContinue: true })
        return
      }

      if (stepHasGeneratedOutput(activeStep, project)) {
        const nextStepId = CREATION_STEPS[currentIndex + 1]?.id
        if (!nextStepId) return

        processedAutoContinueKey.current = location.key
        advanceToStep(nextStepId, { autoContinue: true })
        return
      }

      processedAutoContinueKey.current = location.key
      await goNext(getAutoContinuePayload(activeStep, project))
    }

    runAutoContinue()
  }, [
    advanceToStep,
    currentIndex,
    activeStep,
    generating,
    goNext,
    location.key,
    location.state,
    project,
  ])

  const goToStep = (stepId) => {
    if (pipelineRunningRef.current || pipelineOpen) return

    if (stepId === 'studio') {
      navigate(projectStudioPath(projectId))
      return
    }

    if (stepId === 'storyboard') {
      navigate(projectStoryboardPath(projectId))
      return
    }

    if (stepId === 'characters') {
      if (project.status?.sceneboard === 'done' || storeScenes.length > 0) {
        navigate(projectStepPath(projectId, 'characters'))
      }
      return
    }

    if (stepId === 'environments') {
      if (project.status?.characters === 'done' || storeCharacters.length > 0) {
        navigate(projectStepPath(projectId, 'environments'))
      }
      return
    }

    const index = getStepIndex(stepId)
    if (index <= effectiveMaxStepIndex) {
      navigate(projectStepPath(projectId, stepId))
    }
  }

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

  const handleBackToStory = useCallback(
    (editedScreenplay) => {
      persist({
        ...project,
        screenplay: editedScreenplay,
        status: {
          ...project.status,
          screenplay: editedScreenplay?.trim() ? 'done' : project.status?.screenplay,
        },
      })

      navigate(projectStepPath(projectId, 'story'), {
        state: {
          style: displayStyle,
        },
      })
    },
    [displayStyle, navigate, persist, project, projectId]
  )

  const handleBackToScreenplay = useCallback(async () => {
    navigate(projectStepPath(projectId, 'screenplay'), {
      state: {
        screenplay: displayScreenplay,
        style: displayStyle,
      },
    })
  }, [displayScreenplay, displayStyle, navigate, projectId])

  const handleSceneGenerationMetaChange = useCallback(
    (meta) => {
      const current = loadProject()
      if (
        current.sceneGenerationStatus === meta.sceneGenerationStatus &&
        current.sceneGenerationTotal === meta.sceneGenerationTotal &&
        current.sceneGenerationCompleted === meta.sceneGenerationCompleted &&
        current.sceneGenerationFailed === meta.sceneGenerationFailed
      ) {
        return
      }

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
        (localEnvironments.length > 0 && allEnvironmentsImageComplete(localEnvironments))

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

  useEffect(() => {
    sceneMetaRef.current = handleSceneGenerationMetaChange
    characterMetaRef.current = handleCharacterGenerationMetaChange
    environmentMetaRef.current = handleEnvironmentGenerationMetaChange
  }, [
    handleSceneGenerationMetaChange,
    handleCharacterGenerationMetaChange,
    handleEnvironmentGenerationMetaChange,
  ])

  const isAssetWorkspace =
    activeStep === 'characters' || activeStep === 'environments' || activeStep === 'sceneboard'

  const creationSteps = (
    <>
          {activeStep === 'story' && (
            <StoryStep
              story={project.story}
              visualStyle={project.visualStyle}
              onStoryChange={updateStory}
              onActionChange={setStepAction}
              onNext={goNext}
              generating={generating || pipelineOpen}
              saveError={storySaveError}
              saveStatus={storySaveStatus}
              loading={combinedStepLoading}
            />
          )}
          {activeStep === 'screenplay' && (
            <ScreenplayStep
              screenplay={displayScreenplay}
              style={displayStyle}
              onActionChange={setStepAction}
              onBackToStory={handleBackToStory}
              onSave={handleSaveScreenplay}
              onNext={goNext}
              generating={generating}
              loading={combinedStepLoading}
              saveStatus={screenplaySaveStatus}
              saveError={screenplaySaveError}
            />
          )}
          {activeStep === 'sceneboard' && (
            <SceneboardStep
              projectId={project.projectId}
              screenplay={displayScreenplay}
              sceneGenerationStatus={project.sceneGenerationStatus}
              sceneGenerationStartedAt={project.sceneGenerationStartedAt}
              onGenerationMetaChange={handleSceneGenerationMetaChange}
              onBack={handleBackToScreenplay}
              onContinue={() => navigate(projectStepPath(projectId, 'characters'))}
              loading={false}
            />
          )}
          {activeStep === 'characters' && (
            <CharactersStep
              projectId={project.projectId}
              style={displayStyle}
              onSave={handleSaveCharacters}
              saveStatus={charactersSaveStatus}
              saveError={charactersSaveError ?? charactersLoadError}
              onBack={() =>
                navigate(projectStepPath(projectId, 'sceneboard'), {
                  state: {
                    screenplay: displayScreenplay,
                    style: displayStyle,
                  },
                })
              }
              onNext={goNext}
              onActionChange={setStepAction}
            />
          )}
          {activeStep === 'environments' && (
            <EnvironmentsStep
              projectId={project.projectId}
              style={displayStyle}
              environmentGenerationStatus={project.environmentGenerationStatus}
              environmentGenerationStartedAt={project.environmentGenerationStartedAt}
              loading={false}
              loadError={environmentsLoadError}
              saveStatus={environmentsSaveStatus}
              saveError={environmentsSaveError}
              onGenerationMetaChange={handleEnvironmentGenerationMetaChange}
              onSave={handleSaveEnvironments}
              onBackToCharacters={() => navigate(projectStepPath(projectId, 'characters'))}
            />
          )}
    </>
  )

  return (
    <div className={styles.flow}>
      <ErrorModal
        open={Boolean(error) && activeStep !== 'sceneboard' && activeStep !== 'characters' && activeStep !== 'environments'}
        title={error?.title ?? 'Something went wrong'}
        message={error?.message ?? ''}
        onClose={clearError}
      />
      <div className={styles.body}>
        <main className={`${styles.main} ${isAssetWorkspace ? styles.assetsPageShell : ''}`}>
          <div className={isAssetWorkspace ? undefined : styles.mainInner}>
          {project.projectId ? (
            <ProjectGenerationProvider
              projectId={project.projectId}
              project={project}
              scenes={storeScenes}
              characters={storeCharacters}
              environments={storeEnvironments}
              setScenes={setStoreScenes}
              mergeCharacters={mergeCharacters}
              mergeEnvironments={mergeEnvironments}
              onSceneMetaChange={handleSceneGenerationMetaChange}
              onCharacterMetaChange={handleCharacterGenerationMetaChange}
              onEnvironmentMetaChange={handleEnvironmentGenerationMetaChange}
            >
              {creationSteps}
            </ProjectGenerationProvider>
          ) : (
            creationSteps
          )}
          </div>
        </main>
      </div>
      {stepAction ? (
        <CreationActionBar
          action={stepAction}
          generating={generating || pipelineOpen}
        />
      ) : null}
    </div>
  )
}
