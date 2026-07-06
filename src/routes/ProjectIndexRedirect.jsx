import { Navigate, useOutletContext } from 'react-router-dom'
import { projectDefaultRelativePath } from './paths'

export default function ProjectIndexRedirect() {
  const { projectState } = useOutletContext()
  return <Navigate to={projectDefaultRelativePath(projectState.project)} replace />
}
