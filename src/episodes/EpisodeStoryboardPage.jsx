import { useOutletContext } from 'react-router-dom'
import { getVisualStyleLabel } from '../config/visualStyles'
import EpisodeStoryboard from '../creation/components/episodes/EpisodeStoryboard'
import styles from '../creation/components/episodes/Episodes.module.css'

export default function EpisodeStoryboardPage({ projectId, episodeId }) {
  const { projectState } = useOutletContext()
  const visualStyle = getVisualStyleLabel(projectState.project.visualStyle)

  return (
    <div className={styles.page}>
      <EpisodeStoryboard
        projectId={projectId}
        episodeId={episodeId}
        visualStyle={visualStyle}
      />
    </div>
  )
}
