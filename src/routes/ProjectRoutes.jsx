import { useEffect } from 'react'
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { isProjectReadyForStoryboard, isProjectReadyForStudio } from '../project/projectModel'
import { isStoryboardComplete } from '../storyboard/storyboardStatus'
import shellStyles from '../app/ScreenlyAppShell.module.css'
import StoryArea from '../app/StoryArea'
import StudioPage from '../studio/StudioPage'
import ProjectStoryboardPage from '../storyboard/ProjectStoryboardPage'
import { getDefaultShotSelectionKey } from '../studio/shotSelection'
import {
  canAccessCreationStep,
  getAccessibleCreationStep,
  getResumeStepIndex,
  projectSceneboardPath,
  projectStepPath,
  projectStudioPath,
  stepFromPathname,
} from './paths'

function StoryboardRoute() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projectStore, setHideWorkspaceNav } = useOutletContext()
  const project = projectStore?.project
  const storyboardReady = isProjectReadyForStoryboard(project)

  useEffect(() => {
    setHideWorkspaceNav?.(false)
  }, [setHideWorkspaceNav])

  useEffect(() => {
    if (!storyboardReady) {
      navigate(projectStepPath(projectId, getAccessibleCreationStep(project)), { replace: true })
    }
  }, [navigate, project, projectId, storyboardReady])

  if (!storyboardReady) {
    return <div className={shellStyles.loading}>Preparing storyboard…</div>
  }

  return <ProjectStoryboardPage projectId={projectId} />
}

function CreationRoute() {
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { projectState, projectStore, setHideWorkspaceNav } = useOutletContext()
  const project = projectStore?.project ?? projectState.project
  const currentStep = stepFromPathname(location.pathname)
  const maxStepIndex = getResumeStepIndex(project)
  const stepUnlocked = location.state?.stepUnlock === currentStep

  useEffect(() => {
    setHideWorkspaceNav?.(false)
  }, [setHideWorkspaceNav])

  useEffect(() => {
    if (!currentStep) {
      navigate(projectStepPath(projectId, getAccessibleCreationStep(project)), { replace: true })
      return
    }

    if (!stepUnlocked && !canAccessCreationStep(currentStep, project)) {
      navigate(projectStepPath(projectId, getAccessibleCreationStep(project)), {
        replace: true,
      })
    }
  }, [currentStep, navigate, project, projectId, stepUnlocked])

  useEffect(() => {
    if (!location.state?.stepUnlock) return
    if (!canAccessCreationStep(location.state.stepUnlock, project)) return

    navigate(location.pathname, { replace: true, state: null })
  }, [location.pathname, location.state?.stepUnlock, navigate, project])

  if (!currentStep) return null

  return (
    <StoryArea
      projectState={projectState}
      projectStore={projectStore}
      currentStep={currentStep}
      maxStepIndex={maxStepIndex}
      onOpenStoryboard={() => navigate(projectSceneboardPath(projectId))}
    />
  )
}

function StudioRoute() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { projectState, setStudioFocusMode } = useOutletContext()
  const project = projectState.project
  const studioReady = isProjectReadyForStudio(project)
  const storyboardComplete = isStoryboardComplete(project.studioScenes ?? [])

  useEffect(() => {
    if (!studioReady || !storyboardComplete) {
      navigate(projectStepPath(projectId, getAccessibleCreationStep(project)), { replace: true })
    }
  }, [navigate, project, projectId, storyboardComplete, studioReady])

  if (!studioReady || !storyboardComplete) return null

  return (
    <StudioPage
      studioScenes={project.studioScenes}
      projectName={project.name}
      initialShotAssignments={project.shotAssignments}
      firstShotId={getDefaultShotSelectionKey(project.studioScenes)}
      generatingSceneIds={projectState.generatingSceneIds}
      onGenerateSceneImages={projectState.generateSceneImages}
      regeneratingShotApiId={projectState.regeneratingShotApiId}
      selectingShotCandidateId={projectState.selectingShotCandidateId}
      onRegenerateShot={projectState.regenerateShotImage}
      onRegenerateShotCandidates={projectState.regenerateShotCandidates}
      onSelectShotCandidate={projectState.selectShotCandidate}
      onSaveShot={projectState.saveShotDetails}
      projectCharacters={project.characters ?? []}
      projectEnvironments={project.environments ?? []}
      projectObjects={project.objects ?? []}
      onReassignAssets={() => projectState.assignAssetsToShots({ force: true })}
      onRefreshAssignments={projectState.refreshProject}
      onUpdateShotReviewStatus={projectState.updateShotReviewStatus}
      isActive
      onFocusModeChange={setStudioFocusMode}
      onBackToStory={() => navigate(projectSceneboardPath(projectId))}
    />
  )
}

export { CreationRoute, StoryboardRoute, StudioRoute }
