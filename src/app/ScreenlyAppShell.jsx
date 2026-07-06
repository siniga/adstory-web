import { useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useProjectState } from '../project/useProjectState'
import { ProjectStoreProvider } from '../project/ProjectStoreContext'
import AppRouter from '../routes/AppRouter'

export default function ScreenlyAppShell() {
  const auth = useAuth()
  const projectState = useProjectState()
  const [creating, setCreating] = useState(false)

  return (
    <ProjectStoreProvider persistProject={projectState.persist}>
      <AppRouter
        auth={auth}
        projectState={projectState}
        creating={creating}
        setCreating={setCreating}
      />
    </ProjectStoreProvider>
  )
}
