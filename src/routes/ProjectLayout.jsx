import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BRAND } from '../config/branding'
import DeleteProjectConfirmModal from '../app/components/DeleteProjectConfirmModal'
import ErrorModal from '../app/components/ErrorModal'
import { useProjectStore } from '../project/ProjectStoreContext'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import styles from '../app/AppShell.module.css'
import workspaceStyles from '../app/ProjectWorkspace.module.css'
import ProjectItemsSidebar from '../project/ProjectItemsSidebar'
import {
  getAvailableProjectItems,
  PROJECT_ITEM_CATALOG,
  PROJECT_OVERVIEW_ID,
  projectItemsPath,
} from '../project/projectItems'
import { projectStepPath, stepFromPathname } from './paths'
import RegenerateStoryboardBanner from '../storyboard/components/RegenerateStoryboardBanner'

export default function ProjectLayout({ projectState, user, onLogout }) {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const projectStore = useProjectStore()
  const [hideWorkspaceNav, setHideWorkspaceNav] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const project = projectStore.project
  const availableItems = getAvailableProjectItems(project, {
    scenes: projectStore.scenes,
    characters: projectStore.characters,
    environments: projectStore.environments,
  })
  const activeItemId = stepFromPathname(location.pathname)

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

  const handleSelectProjectItem = (itemId) => {
    if (!itemId || itemId === PROJECT_OVERVIEW_ID) {
      navigate(projectItemsPath(projectId))
      return
    }

    navigate(projectStepPath(projectId, itemId), {
      state: { stepUnlock: itemId },
    })
  }

  const handleBackToOverview = () => {
    navigate(projectItemsPath(projectId))
  }

  const isOverview = !activeItemId
  const activeItemLabel =
    PROJECT_ITEM_CATALOG.find((item) => item.id === activeItemId)?.label ?? null

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
    <div className={styles.shell}>
      {!hideWorkspaceNav && (
        <div className={workspaceStyles.navChrome}>
          <div className={workspaceStyles.navPanel}>
            <div className={workspaceStyles.backBar}>
              <div className={workspaceStyles.brand}>
                <span className={workspaceStyles.logoMark}>{BRAND.logoMark}</span>
                <span className={workspaceStyles.brandName}>{BRAND.name}</span>
              </div>
              <span className={workspaceStyles.divider} aria-hidden="true" />
              {isOverview ? (
                <span className={workspaceStyles.projectName}>{project.name}</span>
              ) : (
                <div className={workspaceStyles.breadcrumb}>
                  <button
                    type="button"
                    className={workspaceStyles.projectNameBtn}
                    onClick={handleBackToOverview}
                    title="Back to project overview"
                  >
                    {project.name}
                  </button>
                  {activeItemLabel ? (
                    <>
                      <span className={workspaceStyles.crumbSep} aria-hidden="true">
                        /
                      </span>
                      <span className={workspaceStyles.crumbCurrent}>{activeItemLabel}</span>
                    </>
                  ) : null}
                </div>
              )}
              <div className={workspaceStyles.headerRight}>
                {!isOverview ? (
                  <button
                    type="button"
                    className={workspaceStyles.backBtn}
                    onClick={handleBackToOverview}
                  >
                    ← Overview
                  </button>
                ) : null}
                <Link to="/projects" className={workspaceStyles.backBtn}>
                  ← Library
                </Link>
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
      <div className={`${styles.content} ${workspaceStyles.workspaceBody}`}>
        {!hideWorkspaceNav ? (
          <ProjectItemsSidebar
            items={availableItems}
            activeId={activeItemId}
            onSelect={handleSelectProjectItem}
          />
        ) : null}
        <div className={workspaceStyles.workspaceMain}>
          <RegenerateStoryboardBanner projectId={projectId} />
          <div className={workspaceStyles.workspaceOutlet}>
            <Outlet
              context={{
                projectState,
                projectStore,
                setHideWorkspaceNav,
                onSelectProjectItem: handleSelectProjectItem,
              }}
            />
          </div>
        </div>
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
