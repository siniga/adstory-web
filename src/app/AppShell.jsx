import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/useAuth'
import { useProjectState } from '../project/useProjectState'
import { ProjectStoreProvider, useProjectStore } from '../project/ProjectStoreContext'
import AppRouter from '../routes/AppRouter'

function ProjectStoreSync({ syncRef }) {
  const { applyProject } = useProjectStore()

  useEffect(() => {
    syncRef.current = (next) => {
      applyProject(next, { replaceSlices: true })
    }
  }, [applyProject, syncRef])

  return null
}

function ProjectWorkspace({ auth, creating, setCreating, projectState, syncRef }) {
  return (
    <>
      <ProjectStoreSync syncRef={syncRef} />
      <AppRouter
        auth={auth}
        projectState={projectState}
        creating={creating}
        setCreating={setCreating}
      />
    </>
  )
}

export default function AppShell() {
  const auth = useAuth()
  const syncToStoreRef = useRef(() => {})
  const syncToStore = useCallback((next) => {
    syncToStoreRef.current(next)
  }, [])
  const projectState = useProjectState({
    syncToStore,
  })
  const [creating, setCreating] = useState(false)

  return (
    <ProjectStoreProvider persistProject={projectState.persistLocalOnly}>
      <ProjectWorkspace
        auth={auth}
        projectState={projectState}
        syncRef={syncToStoreRef}
        creating={creating}
        setCreating={setCreating}
      />
    </ProjectStoreProvider>
  )
}
