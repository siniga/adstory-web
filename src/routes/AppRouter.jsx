import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import LoginPage from '../app/LoginPage'
import ProjectsPage from '../app/ProjectsPage'
import { BRAND } from '../config/branding'
import { DEFAULT_VISUAL_STYLE } from '../config/visualStyles'
import { createAdstoryProject } from '../services/adstoryApi'
import { projectDefaultPath } from './paths'
import ProjectLayout from './ProjectLayout'
import ProjectIndexRedirect from './ProjectIndexRedirect'
import { CreationRoute, StoryboardRoute, StudioRoute } from './ProjectRoutes'
import RequireAuth from './RequireAuth'
import styles from '../app/ScreenlyAppShell.module.css'

function LoginRoute({ auth }) {
  const navigate = useNavigate()

  if (auth.isAuthenticated) {
    return <Navigate to="/projects" replace />
  }

  const handleLogin = async (credentials) => {
    await auth.login(credentials)
    navigate('/projects')
  }

  const handleRegister = async (payload) => {
    await auth.register(payload)
    navigate('/projects')
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onRegister={handleRegister}
      error={auth.error}
      onClearError={() => auth.setError(null)}
    />
  )
}

function ProjectsRoute({ auth, projectState, creating, setCreating }) {
  const navigate = useNavigate()

  const handleOpenProject = async (projectId) => {
    const loaded = await projectState.selectProject(projectId)
    navigate(projectDefaultPath(loaded))
  }

  const handleCreateProject = async () => {
    setCreating(true)
    try {
      const { projectId } = await createAdstoryProject({
        title: BRAND.untitledProjectName,
        style: DEFAULT_VISUAL_STYLE,
      })
      const loaded = await projectState.selectProject(projectId)
      navigate(projectDefaultPath(loaded))
    } finally {
      setCreating(false)
    }
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
            path="/projects/:projectId"
            element={
              <ProjectWorkspaceRoute auth={auth} projectState={projectState} />
            }
          >
            <Route index element={<ProjectIndexRedirect />} />
            <Route path="story" element={<CreationRoute />} />
            <Route path="script" element={<CreationRoute />} />
            <Route path="screenplay" element={<CreationRoute />} />
            <Route path="sceneboard" element={<CreationRoute />} />
            <Route path="episodes" element={<LegacyEpisodesRedirect />} />
            <Route path="episodes/:episodeId/storyboard" element={<LegacyEpisodeStoryboardRedirect />} />
            <Route path="scenes" element={<LegacyScenesRedirect />} />
            <Route path="shots" element={<LegacyShotsRedirect />} />
            <Route path="characters" element={<CreationRoute />} />
            <Route path="assets" element={<CreationRoute />} />
            <Route path="environments" element={<CreationRoute />} />
            <Route path="storyboard" element={<StoryboardRoute />} />
            <Route path="studio" element={<StudioRoute />} />
          </Route>
          <Route index element={<Navigate to="/projects" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
