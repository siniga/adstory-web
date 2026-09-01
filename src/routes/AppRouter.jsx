import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import LoginPage from '../app/LoginPage'
import ProjectsPage from '../app/ProjectsPage'
import { BRAND } from '../config/branding'
import { DEFAULT_VISUAL_STYLE, getVisualStyleLabel, normalizeVisualStyle } from '../config/visualStyles'
import { START_STEP } from '../app/components/NewProjectStyleModal'
import * as projectApi from '../services/projectApi'
import { saveProjectScenesBulk } from '../services/adstoryApi'
import ProjectItemsPage from '../project/ProjectItemsPage'
import { projectItemsPath } from '../project/projectItems'
import { useProjectStore } from '../project/ProjectStoreContext'
import { projectStepPath, projectStoryboardPath } from './paths'
import ProjectLayout from './ProjectLayout'
import { CreationRoute, StoryboardRoute, StudioRoute } from './ProjectRoutes'
import RequireAuth from './RequireAuth'
import styles from '../app/AppShell.module.css'

function LoginRoute({ auth }) {
  const navigate = useNavigate()

  if (auth.isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  const handleLogin = async (credentials) => {
    await auth.login(credentials)
    navigate('/projects')
  }

  return (
    <LoginPage
      mode="login"
      onLogin={handleLogin}
      error={auth.error}
      onClearError={() => auth.setError(null)}
    />
  )
}

function RegisterRoute({ auth }) {
  const navigate = useNavigate()

  if (auth.isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  const handleRegister = async (payload) => {
    await auth.register(payload)
    navigate('/projects')
  }

  return (
    <LoginPage
      mode="register"
      onRegister={handleRegister}
      error={auth.error}
      onClearError={() => auth.setError(null)}
    />
  )
}

function ProjectsRoute({ auth, projectState, creating, setCreating }) {
  const navigate = useNavigate()
  const projectStore = useProjectStore()

  useEffect(() => {
    projectState.exitProject()
    projectStore.clearProject()
  }, [projectState.exitProject, projectStore.clearProject])

  const handleOpenProject = async (projectId) => {
    await projectState.selectProject(projectId)
    navigate(projectItemsPath(projectId))
  }

  const handleCreateProject = async (payload = {}) => {
    setCreating(true)
    try {
      const startWith = payload.startWith ?? 'story'
      const startStep = START_STEP[startWith] ?? 'story'
      const styleValue = normalizeVisualStyle(payload.visualStyle ?? DEFAULT_VISUAL_STYLE)
      const createPayload = {
        title: payload.title?.trim() || BRAND.untitledProjectName,
        style: getVisualStyleLabel(styleValue),
        current_step: startStep,
      }

      if (startWith === 'story' && payload.story?.trim()) {
        createPayload.story = payload.story.trim()
      }
      if (startWith === 'screenplay' && payload.screenplay?.trim()) {
        createPayload.screenplay = payload.screenplay.trim()
      }

      const { projectId, project } = await projectApi.createProject(createPayload)

      if (startWith === 'scenes' && payload.scenes?.length) {
        await saveProjectScenesBulk(projectId, payload.scenes)
      }

      return { projectId, project, startStep }
    } finally {
      setCreating(false)
    }
  }

  const handleStartCreatedProject = async (projectId, startStep = 'story') => {
    await projectState.selectProject(projectId)
    if (startStep === 'items' || startStep === 'hub') {
      navigate(projectItemsPath(projectId))
      return
    }

    if (startStep === 'storyboard') {
      navigate(projectStoryboardPath(projectId))
      return
    }
    navigate(projectStepPath(projectId, startStep), {
      state: { stepUnlock: startStep },
    })
  }

  const handleDeleteProject = async (projectId) => {
    await projectState.deleteProject(projectId)
  }

  const handleLogout = async () => {
    projectState.exitProject()
    try {
      await auth.logout()
    } catch {
      // Token cleared locally even if API logout fails.
    }
    navigate('/login')
  }

  return (
    <ProjectsPage
      user={auth.user}
      onOpenProject={handleOpenProject}
      onCreateProject={handleCreateProject}
      onStartCreatedProject={handleStartCreatedProject}
      onDeleteProject={handleDeleteProject}
      onLogout={handleLogout}
      creating={creating}
    />
  )
}

function ProjectWorkspaceRoute({ auth, projectState }) {
  const navigate = useNavigate()

  const handleLogout = async () => {
    projectState.exitProject()
    try {
      await auth.logout()
    } catch {
      // Token cleared locally even if API logout fails.
    }
    navigate('/login')
  }

  return (
    <ProjectLayout
      projectState={projectState}
      user={auth.user}
      onLogout={handleLogout}
    />
  )
}

function LegacyEpisodesRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/projects/${projectId}/sceneboard`} replace />
}

function LegacyScenesRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/projects/${projectId}/sceneboard`} replace />
}

function LegacyShotsRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/projects/${projectId}/sceneboard`} replace />
}

function LegacyStoryboardRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/projects/${projectId}/sceneboard`} replace />
}

function LegacyEpisodeStoryboardRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/projects/${projectId}/sceneboard`} replace />
}

function LegacyScriptRedirect() {
  const { projectId } = useParams()
  return <Navigate to={`/projects/${projectId}/screenplay`} replace />
}

export default function AppRouter({ auth, projectState, creating, setCreating }) {
  if (auth.checking) {
    return <div className={styles.loading}>Loading…</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginRoute auth={auth} />}
        />
        <Route
          path="/register"
          element={<RegisterRoute auth={auth} />}
        />
        <Route element={<RequireAuth isAuthenticated={auth.isAuthenticated} />}>
          <Route
            path="/projects"
            element={
              <ProjectsRoute
                auth={auth}
                projectState={projectState}
                creating={creating}
                setCreating={setCreating}
              />
            }
          />
          <Route
            path="/projects/:projectId/storyboard"
            element={<StoryboardRoute projectState={projectState} />}
          />
          <Route
            path="/projects/:projectId/studio"
            element={<StudioRoute projectState={projectState} />}
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProjectWorkspaceRoute auth={auth} projectState={projectState} />
            }
          >
            <Route index element={<ProjectItemsPage />} />
            <Route path="story" element={<CreationRoute />} />
            <Route path="script" element={<LegacyScriptRedirect />} />
            <Route path="screenplay" element={<CreationRoute />} />
            <Route path="sceneboard" element={<CreationRoute />} />
            <Route path="episodes" element={<LegacyEpisodesRedirect />} />
            <Route path="episodes/:episodeId/storyboard" element={<LegacyEpisodeStoryboardRedirect />} />
            <Route path="scenes" element={<LegacyScenesRedirect />} />
            <Route path="shots" element={<LegacyShotsRedirect />} />
            <Route path="characters" element={<CreationRoute />} />
            <Route path="assets" element={<CreationRoute />} />
            <Route path="environments" element={<CreationRoute />} />
          </Route>
          <Route index element={<Navigate to="/projects" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
