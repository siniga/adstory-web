import { useNavigate, useOutletContext } from 'react-router-dom'
import { BRAND } from '../config/branding'
import { isProjectReadyForStoryboard, isProjectReadyForStudio } from './projectModel'
import { getAvailableProjectItems } from './projectItems'
import { projectStoryboardPath, projectStudioPath } from '../routes/paths'
import styles from './ProjectItemsPage.module.css'

export default function ProjectItemsPage() {
  const navigate = useNavigate()
  const { projectStore, projectState, onSelectProjectItem } = useOutletContext()
  const project = projectState?.project ?? projectStore?.project ?? {}
  const items = getAvailableProjectItems(project, {
    scenes: projectStore?.scenes,
    characters: projectStore?.characters,
    environments: projectStore?.environments,
  })
  const storyboardReady = isProjectReadyForStoryboard({
    ...project,
    scenes: projectStore?.scenes ?? project.scenes,
    environments: projectStore?.environments ?? project.environments,
  })
  const studioReady = isProjectReadyForStudio(project)

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <p className={styles.eyebrow}>Project</p>
          <h1 className={styles.title}>{project.name || BRAND.untitledProjectName}</h1>
          <p className={styles.subtitle}>
            {items.length
              ? 'Open an item from the sidebar to view it.'
              : 'This project does not have story, screenplay, or scenes yet.'}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.workspaceBtn}
            onClick={() => navigate(projectStoryboardPath(project.projectId))}
            disabled={!storyboardReady || !project.projectId}
            title={
              storyboardReady
                ? 'Open Storyboard'
                : 'Add scenes and environments before opening Storyboard'
            }
          >
            Open Storyboard
          </button>
          <button
            type="button"
            className={styles.studioBtn}
            onClick={() => navigate(projectStudioPath(project.projectId))}
            disabled={!studioReady || !project.projectId}
            title={studioReady ? 'Open Studio' : 'Generate shots before opening Studio'}
          >
            Open Studio
          </button>
        </div>
      </div>
      {items.length ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.card}
              onClick={() => onSelectProjectItem?.(item.id)}
            >
              <span className={styles.cardLabel}>{item.label}</span>
              <span className={styles.cardHint}>Open</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
