import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BRAND } from '../config/branding'
import DeleteProjectConfirmModal from '../app/components/DeleteProjectConfirmModal'
import ErrorModal from '../app/components/ErrorModal'
import { isProjectReadyForStoryboard, isProjectReadyForStudio } from '../project/projectModel'
import { isStoryboardComplete } from '../storyboard/storyboardStatus'
import { useProjectStore } from '../project/ProjectStoreContext'
import ModeSwitcher from '../app/ModeSwitcher'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import styles from '../app/ScreenlyAppShell.module.css'
import workspaceStyles from '../app/ProjectWorkspace.module.css'
import {
  getStoryAreaStep,
  projectStepPath,
  projectStoryboardPath,
  projectStudioPath,
  workspaceModeFromPathname,
} from './paths'

export default function ProjectLayout({ projectState, user, onLogout }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const projectStore = useProjectStore()
  const [studioFocusMode, setStudioFocusMode] = useState(false)
  const [hideWorkspaceNav, setHideWorkspaceNav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const project = projectStore.project
  const activeMode = workspaceModeFromPathname(location.pathname)
  const studioReady = isProjectReadyForStudio(project)
  const storyboardReady = isProjectReadyForStoryboard(project)
  const storyboardComplete = isStoryboardComplete(project.studioScenes ?? [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)

    projectStore
      .loadProject(projectId, { force: true, reason: 'enter project' })
      .then(() => {
        if (!cancelled) setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load project')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [projectId])

  const handleBackToProjects = () => {
    projectState.exitProject()
    projectStore.clearProject()
    navigate('/projects')
  }

  const handleDeleteClick = () => {
    setDeleteError(null)
    setPendingDelete(true)
  }

  const handleCancelDelete = () => {
    if (deleting) return
    setPendingDelete(false)
  }

  const handleConfirmDelete = async () => {
    if (deleting) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await projectState.deleteProject(projectId)
      projectStore.clearProject()
      navigate('/projects')
    } catch (err) {
      setDeleteError(formatUserFriendlyError(err).message)
      setPendingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  const handleModeChange = (mode) => {
    if (mode === 'storyboard' && !storyboardReady) return
    if (mode === 'studio' && (!studioReady || !storyboardComplete)) return

    if (mode === 'story') {
      navigate(projectStepPath(projectId, getStoryAreaStep(project)))
      return
    }

    if (mode === 'storyboard') {
      navigate(projectStoryboardPath(projectId))
      return
    }

    if (mode === 'studio') {
      navigate(projectStudioPath(projectId))
    }
  }

  if (loading) {
    return <div className={styles.loading}>Loading project…</div>
  }

  if (loadError) {
    return (
      <div className={styles.loading}>
        <p>{loadError}</p>
        <button type="button" onClick={handleBackToProjects}>
          Back to library
        </button>
      </div>
    )
  }

  return (
    <div className={`${styles.shell} ${studioFocusMode ? styles.shellStudioFocus : ''}`}>
      {!studioFocusMode && !hideWorkspaceNav && (
        <div className={workspaceStyles.navChrome}>
          <div className={workspaceStyles.navPanel}>
            <div className={workspaceStyles.backBar}>
              <div className={workspaceStyles.brand}>
                <span className={workspaceStyles.logoMark}>{BRAND.logoMark}</span>
                <span className={workspaceStyles.brandName}>{BRAND.name}</span>
              </div>
              <span className={workspaceStyles.divider} aria-hidden="true" />
              <span className={workspaceStyles.projectName}>{project.name}</span>
              <ModeSwitcher
                activeMode={activeMode}
                onModeChange={handleModeChange}
                storyboardEnabled={storyboardReady}
                studioEnabled={studioReady && storyboardComplete}
                compact
              />
              <div className={workspaceStyles.headerRight}>
                <button type="button" className={workspaceStyles.backBtn} onClick={handleBackToProjects}>
                  ← Library
                </button>
                <button
                  type="button"
                  className={workspaceStyles.deleteProjectBtn}
                  onClick={handleDeleteClick}
                >
                  Delete project
                </button>
                {user?.name && <span className={workspaceStyles.userName}>{user.name}</span>}
                <button type="button" className={workspaceStyles.logoutBtn} onClick={onLogout}>
                  Log out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={styles.content}>
        <Outlet
          context={{
            projectState,
            projectStore,
            setHideWorkspaceNav,
            setStudioFocusMode,
          }}
        />
      </div>

      <DeleteProjectConfirmModal
        open={pendingDelete}
        projectTitle={project.name}
        deleting={deleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <ErrorModal
        open={Boolean(deleteError)}
        title="Could not delete project"
        message={deleteError}
        onClose={() => setDeleteError(null)}
      />
    </div>
  )
}
