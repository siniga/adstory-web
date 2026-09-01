import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { isProjectReadyForStoryboard, isProjectReadyForStudio } from '../project/projectModel'
import { projectItemsPath } from '../project/projectItems'
import { useProjectStore } from '../project/ProjectStoreContext'
import shellStyles from '../app/AppShell.module.css'
import StoryArea from '../app/StoryArea'
import StudioPage from '../studio/StudioPage'
import ProjectStoryboardPage from '../storyboard/ProjectStoryboardPage'
import { getDefaultShotSelectionKey } from '../studio/shotSelection'
import {
  canAccessCreationStep,
  getAccessibleCreationStep,
  getResumeStepIndex,
  isProjectWorkspacePath,
  projectSceneboardPath,
  projectStepPath,
  stepFromPathname,
} from './paths'

function StoryboardRoute({ projectState }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const projectStore = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const project = projectStore?.project ?? projectState?.project
  const storyboardReady = isProjectReadyForStoryboard({
    ...project,
    scenes: projectStore?.scenes ?? project?.scenes,
    environments: projectStore?.environments ?? project?.environments,
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    Promise.all([
      projectState.selectProject(projectId),
      projectStore.loadProject(projectId, { force: true, reason: 'enter storyboard' }),
    ])
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load storyboard')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (loading || !project?.projectId) return
    if (!storyboardReady) {
      navigate(projectItemsPath(projectId), { replace: true })
    }
  }, [loading, navigate, project?.projectId, projectId, storyboardReady])

  if (loading) {
    return <div className={shellStyles.loading}>Loading storyboard…</div>
  }

  if (loadError) {
    return (
      <div className={shellStyles.loading}>
        <p>{loadError}</p>
        <button type="button" onClick={() => navigate(projectItemsPath(projectId))}>
          Back to project
        </button>
      </div>
    )
  }

  if (!storyboardReady) return null

  return (
    <div className={shellStyles.shell}>
      <div className={shellStyles.content}>
        <ProjectStoryboardPage
          projectId={projectId}
          onBackToProject={() => navigate(projectItemsPath(projectId))}
        />
      </div>
    </div>
  )
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
    if (!project?.projectId || !projectId) return
    if (!isProjectWorkspacePath(location.pathname, projectId)) return
    if (!currentStep) return

    if (!stepUnlocked && !canAccessCreationStep(currentStep, project)) {
      navigate(projectStepPath(projectId, getAccessibleCreationStep(project)), {
        replace: true,
      })
    }
  }, [currentStep, location.pathname, navigate, project, projectId, stepUnlocked])

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

function StudioRoute({ projectState }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const projectStore = useProjectStore()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const project = projectState.project
  const studioReady = isProjectReadyForStudio(project)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    Promise.all([
      projectState.selectProject(projectId),
      projectStore.loadProject(projectId, { force: true, reason: 'enter studio' }),
    ])
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load studio')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  useEffect(() => {
    if (loading || !project?.projectId) return
    if (!studioReady) {
      navigate(projectItemsPath(projectId), { replace: true })
    }
  }, [loading, navigate, project?.projectId, projectId, studioReady])

  if (loading) {
    return <div className={shellStyles.loading}>Loading studio…</div>
  }

  if (loadError) {
    return (
      <div className={shellStyles.loading}>
        <p>{loadError}</p>
        <button type="button" onClick={() => navigate(projectItemsPath(projectId))}>
          Back to project
        </button>
      </div>
    )
  }

  if (!studioReady) return null

  return (
    <div className={shellStyles.shell}>
      <div className={shellStyles.content}>
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
        onBackToStory={() => navigate(projectItemsPath(projectId))}
      />
      </div>
    </div>
  )
}

export { CreationRoute, StoryboardRoute, StudioRoute }
