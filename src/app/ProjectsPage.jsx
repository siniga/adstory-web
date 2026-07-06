import { useCallback, useEffect, useState } from 'react'
import { BRAND } from '../config/branding'
import DeleteProjectConfirmModal from './components/DeleteProjectConfirmModal'
import ErrorModal from './components/ErrorModal'
import * as screenlyApi from '../services/screenlyApi'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import styles from './ProjectsPage.module.css'

function formatUpdatedAt(value) {
  if (!value) return 'Recently updated'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently updated'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function previewText(storyPreview, story) {
  const text = (storyPreview ?? story)?.trim()
  if (!text) return 'No story yet. Open this project to start writing.'
  return text
}

export default function ProjectsPage({
  user,
  onOpenProject,
  onCreateProject,
  onDeleteProject,
  onLogout,
  creating,
}) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await screenlyApi.listProjects()
      setProjects(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreate = async () => {
    setError(null)
    try {
      await onCreateProject()
      await loadProjects()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project')
    }
  }

  const handleOpen = async (projectId) => {
    setError(null)
    try {
      await onOpenProject(projectId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open project')
    }
  }

  const handleDeleteClick = (event, project) => {
    event.preventDefault()
    event.stopPropagation()
    setDeleteError(null)
    setPendingDelete(project)
  }

  const handleCancelDelete = () => {
    if (deleting) return
    setPendingDelete(null)
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete || deleting) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await onDeleteProject(pendingDelete.id)
      setProjects((items) => items.filter((item) => String(item.id) !== String(pendingDelete.id)))
      setPendingDelete(null)
    } catch (err) {
      setDeleteError(formatUserFriendlyError(err).message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={styles.projectsPage}>
      <header className={styles.header}>
        <div className={styles.titleBlock}>
          <span className={styles.eyebrow}>{BRAND.name}</span>
          <h1>Project Library</h1>
          <p>Create a new project or continue editing an existing storyboard.</p>
        </div>
        <div className={styles.headerActions}>
          {user?.name && <span className={styles.userName}>{user.name}</span>}
          <button type="button" className={styles.createBtn} onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating…' : 'New Project'}
          </button>
          <button type="button" className={styles.logoutBtn} onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {error && <p className={styles.error}>{error}</p>}

        {loading ? (
          <div className={styles.empty}>Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className={styles.empty}>
            No projects yet. Click <strong>New Project</strong> to get started.
          </div>
        ) : (
          <div className={styles.grid}>
            {projects.map((item) => (
              <article key={item.id} className={styles.cardWrap}>
                <button type="button" className={styles.card} onClick={() => handleOpen(item.id)}>
                  <h2 className={styles.cardTitle}>{item.title || BRAND.untitledProjectName}</h2>
                  <p className={styles.cardPreview}>{previewText(item.story_preview, item.story)}</p>
                  <dl className={styles.cardStats}>
                    <div className={styles.stat}>
                      <dt>Scenes</dt>
                      <dd>{item.scenes_count ?? 0}</dd>
                    </div>
                    <div className={styles.stat}>
                      <dt>Shots</dt>
                      <dd>{item.shots_count ?? 0}</dd>
                    </div>
                    <div className={styles.stat}>
                      <dt>Images</dt>
                      <dd>{item.generated_images_count ?? 0}</dd>
                    </div>
                  </dl>
                  <span className={styles.cardMeta}>Last updated {formatUpdatedAt(item.updated_at)}</span>
                </button>
                <button
                  type="button"
                  className={styles.cardMenuBtn}
                  aria-label={`Delete ${item.title || BRAND.untitledProjectName}`}
                  onClick={(event) => handleDeleteClick(event, item)}
                >
                  Delete
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      <DeleteProjectConfirmModal
        open={Boolean(pendingDelete)}
        projectTitle={pendingDelete?.title || BRAND.untitledProjectName}
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
