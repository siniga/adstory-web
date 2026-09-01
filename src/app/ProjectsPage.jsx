import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  Clapperboard,
  Clock3,
  Film,
  FolderPlus,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Menu,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { BRAND } from '../config/branding'
import DeleteProjectConfirmModal from './components/DeleteProjectConfirmModal'
import ErrorModal from './components/ErrorModal'
import NewProjectStyleModal from './components/NewProjectStyleModal'
import ProjectProcessorModal from './components/ProjectProcessorModal'
import {
  getProcessorLandingStep,
  shouldRunCreateProcessor,
} from './components/projectProcessor'
import AppSidebar from './components/AppSidebar'
import * as projectApi from '../services/projectApi'
import { formatUserFriendlyError } from '../utils/userFriendlyErrors'
import { getVisualStyleLabel } from '../config/visualStyles'
import { resolveMediaUrl } from '../utils/resolveMediaUrl'

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
  if (!text) return 'No story yet. Start writing your story.'
  return text
}

function coverGradient(projectId) {
  const gradients = [
    'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 40%, #7c3aed 70%, #c4b5fd 100%)',
    'linear-gradient(135deg, #0c1445 0%, #1e3a8a 40%, #6366f1 75%, #a5b4fc 100%)',
    'linear-gradient(135deg, #111827 0%, #312e81 45%, #8b5cf6 80%, #ddd6fe 100%)',
    'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #7c3aed 85%, #e9d5ff 100%)',
  ]
  const key = String(projectId ?? '0')
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash + key.charCodeAt(i) * (i + 1)) % gradients.length
  return gradients[hash]
}

function projectCoverUrl(project) {
  return resolveMediaUrl(
    project?.cover_image_url ||
      project?.cover_url ||
      project?.thumbnail_url ||
      project?.preview_image_url ||
      null
  )
}

function ProjectCardMenu({ project, onDelete }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div
      ref={menuRef}
      className="absolute right-2 top-2 z-20"
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
      }}
    >
      <button
        type="button"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition hover:bg-black/65"
        aria-label={`Project actions for ${project.title || BRAND.untitledProjectName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
      >
        <MoreVertical className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            role="menu"
            className="absolute right-0 mt-1.5 min-w-[128px] overflow-hidden rounded-lg border border-white/10 bg-[#151922] shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12px] text-rose-300 transition hover:bg-rose-500/10"
              onClick={(event) => {
                event.preventDefault()
                event.stopPropagation()
                setOpen(false)
                onDelete(event, project)
              }}
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.75} />
              Delete
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function ProjectCard({ project, view, onOpen, onDelete }) {
  const title = project.title || BRAND.untitledProjectName
  const coverUrl = projectCoverUrl(project)
  const description = previewText(project.story_preview, project.story)

  const stats = [
    {
      label: 'Scenes',
      value: project.scenes_count ?? 0,
      icon: Film,
      tone: 'bg-violet-500/15 text-violet-300',
    },
    {
      label: 'Shots',
      value: project.shots_count ?? 0,
      icon: Clapperboard,
      tone: 'bg-sky-500/15 text-sky-300',
    },
    {
      label: 'Images',
      value: project.generated_images_count ?? 0,
      icon: ImageIcon,
      tone: 'bg-emerald-500/15 text-emerald-300',
    },
  ]

  if (view === 'list') {
    return (
      <motion.article
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="screenly-card-hover relative overflow-hidden rounded-2xl border border-white/8 bg-[#12151f]"
      >
        <button
          type="button"
          className="flex w-full items-center gap-3 p-2.5 text-left"
          onClick={() => onOpen(project.id)}
        >
          <div
            className="relative h-14 w-[96px] shrink-0 overflow-hidden rounded-xl"
            style={{ background: coverUrl ? undefined : coverGradient(project.id) }}
          >
            {coverUrl ? (
              <img src={coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center opacity-40">
                <Clapperboard className="h-5 w-5 text-white" strokeWidth={1.25} />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pr-8">
            <h2 className="truncate text-[13px] font-semibold text-white">{title}</h2>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">{description}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon
                return (
                  <span key={stat.label} className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full ${stat.tone}`}>
                      <Icon className="h-2.5 w-2.5" strokeWidth={2} />
                    </span>
                    <span className="font-medium text-zinc-200">{stat.value}</span>
                    <span>{stat.label}</span>
                  </span>
                )
              })}
              <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
                <Clock3 className="h-3 w-3" />
                {formatUpdatedAt(project.updated_at)}
              </span>
            </div>
          </div>
        </button>
        <ProjectCardMenu project={project} onDelete={onDelete} />
      </motion.article>
    )
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="screenly-card-hover group relative overflow-hidden rounded-2xl border border-white/8 bg-[#12151f]"
    >
      <button type="button" className="block w-full text-left" onClick={() => onOpen(project.id)}>
        <div
          className="relative aspect-[2/1] overflow-hidden"
          style={{ background: coverUrl ? undefined : coverGradient(project.id) }}
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover transition duration-400 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(255,255,255,0.1),transparent_45%)]" />
              <Clapperboard className="relative h-6 w-6 text-white/35" strokeWidth={1.25} />
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#12151f] via-transparent to-transparent opacity-70" />
        </div>

        <div className="space-y-1.5 px-2.5 pb-2.5 pt-2">
          <div>
            <h2 className="line-clamp-1 text-[12.5px] font-semibold leading-snug text-white">{title}</h2>
            <p className="mt-0.5 line-clamp-1 text-[10.5px] leading-snug text-zinc-400">{description}</p>
          </div>

          <div className="flex items-center gap-2.5 border-t border-white/6 pt-1.5">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="flex min-w-0 items-center gap-1">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${stat.tone}`}>
                    <Icon className="h-2.5 w-2.5" strokeWidth={1.85} />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold leading-none tabular-nums text-zinc-100">
                      {stat.value}
                    </div>
                    <div className="mt-0.5 text-[8px] uppercase tracking-wide text-zinc-500">{stat.label}</div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <Clock3 className="h-2.5 w-2.5 shrink-0" />
            <span>Updated {formatUpdatedAt(project.updated_at)}</span>
          </div>
        </div>
      </button>

      <ProjectCardMenu project={project} onDelete={onDelete} />
    </motion.article>
  )
}

function EmptyProjectsState({ onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-[#0f131c]/70 px-5 py-10 text-center"
    >
      <div className="relative mb-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-[#151922] shadow-[0_0_28px_rgba(139,92,246,0.18)]">
          <FolderPlus className="h-6 w-6 text-violet-300" strokeWidth={1.4} />
        </div>
        <Sparkles className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 text-violet-300" />
      </div>
      <h3 className="text-[15px] font-semibold text-white">Ready to create something amazing?</h3>
      <p className="mt-1 max-w-sm text-[12px] text-zinc-400">
        Click &quot;New Project&quot; to get started.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="screenly-gradient-btn mt-4 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-semibold text-white transition hover:brightness-110"
      >
        <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
        New Project
      </button>
    </motion.div>
  )
}

export default function ProjectsPage({
  user,
  onOpenProject,
  onCreateProject,
  onStartCreatedProject,
  onDeleteProject,
  onLogout,
  creating,
}) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [styleModalOpen, setStyleModalOpen] = useState(false)
  const [processor, setProcessor] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState('recent')
  const [viewMode, setViewMode] = useState('grid')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeNav, setActiveNav] = useState('projects')

  const toFriendlyError = useCallback((err, fallbackMessage) => {
    return formatUserFriendlyError(
      err instanceof Error ? err.message : fallbackMessage
    )
  }, [])

  const loadProjects = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const items = await projectApi.listProjects()
      setProjects(items)
    } catch (err) {
      setLoadError(toFriendlyError(err, 'Failed to load projects'))
    } finally {
      setLoading(false)
    }
  }, [toFriendlyError])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleOpenStyleModal = () => {
    if (processor) return
    setActionError(null)
    setStyleModalOpen(true)
  }

  const handleCancelStyleModal = () => {
    if (creating) return
    setStyleModalOpen(false)
  }

  const handleConfirmCreate = async (payload) => {
    setActionError(null)
    try {
      const result = await onCreateProject(payload)
      const projectId = result?.projectId ?? result?.project?.id
      if (!projectId) {
        throw new Error('Project was created but no project ID was returned.')
      }

      setStyleModalOpen(false)
      if (!shouldRunCreateProcessor(payload.startWith ?? 'story')) {
        onStartCreatedProject(projectId, getProcessorLandingStep(payload.startWith ?? 'story'))
        loadProjects()
        return
      }

      setProcessor({
        projectId,
        projectName: payload.title?.trim() || BRAND.untitledProjectName,
        startWith: payload.startWith ?? 'story',
        style: result.project?.style ?? getVisualStyleLabel(payload.visualStyle),
        story: payload.story?.trim() ?? result.project?.story ?? '',
        screenplay: payload.screenplay?.trim() ?? result.project?.screenplay ?? '',
      })
      loadProjects()
    } catch (err) {
      setActionError(toFriendlyError(err, 'Failed to create project'))
    }
  }

  const handleProcessorComplete = useCallback((result) => {
    const projectId = processor?.projectId
    const landingStep =
      result?.landingStep ?? getProcessorLandingStep(processor?.startWith ?? 'story')
    setProcessor(null)
    if (!projectId) return
    onStartCreatedProject(projectId, landingStep)
  }, [onStartCreatedProject, processor?.projectId, processor?.startWith])

  const handleProcessorDismiss = useCallback(() => {
    setProcessor(null)
    loadProjects()
  }, [loadProjects])

  const handleOpen = async (projectId) => {
    setActionError(null)
    try {
      await onOpenProject(projectId)
    } catch (err) {
      setActionError(toFriendlyError(err, 'Failed to open project'))
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

  const handleSidebarNavigate = (id) => {
    setActiveNav(id === 'settings' ? 'settings' : 'projects')
  }

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    let next = [...projects]

    if (query) {
      next = next.filter((item) => {
        const title = (item.title || '').toLowerCase()
        const story = (item.story_preview || item.story || '').toLowerCase()
        return title.includes(query) || story.includes(query)
      })
    }

    next.sort((a, b) => {
      if (sortMode === 'title') {
        return String(a.title || '').localeCompare(String(b.title || ''))
      }
      const aTime = new Date(a.updated_at || 0).getTime()
      const bTime = new Date(b.updated_at || 0).getTime()
      return bTime - aTime
    })

    return next
  }, [projects, searchQuery, sortMode])

  const firstName = user?.name?.trim()?.split(/\s+/)[0] || 'there'

  return (
    <div className="flex h-screen overflow-hidden bg-[#07080d] text-zinc-100">
      <AppSidebar
        user={user}
        activeId={activeNav === 'settings' ? 'settings' : 'projects'}
        onNavigate={handleSidebarNavigate}
        onLogout={onLogout}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-col gap-2.5 border-b border-white/6 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/[0.03] p-1.5 text-zinc-300 transition hover:bg-white/[0.06] lg:hidden"
              aria-label="Open menu"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-[16px] font-semibold tracking-tight text-white sm:text-[17px]">
                Welcome back, {firstName}{' '}
                <span aria-hidden="true">👋</span>
              </h1>
              <p className="mt-0.5 truncate text-[11px] text-zinc-400">
                Create new projects or continue your storyboards.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <label className="relative w-[168px] sm:w-[196px]">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search projects..."
                className="w-full rounded-xl border border-white/8 bg-[#12151f] py-1.5 pl-8 pr-2.5 text-[12px] text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500/45 focus:ring-1 focus:ring-violet-500/20"
              />
            </label>

            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/8 bg-[#12151f] text-zinc-400 transition hover:border-violet-500/30 hover:text-white"
              aria-label="Notifications"
            >
              <Bell className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="screenly-gradient-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(139,92,246,0.28)] transition disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleOpenStyleModal}
              disabled={creating}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              {creating ? 'Creating…' : 'New Project'}
            </motion.button>
          </div>
        </header>

        <main className="screenly-app-scroll flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6 lg:py-5">
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28 }}
            className="screenly-hero-bg relative mb-5 overflow-hidden rounded-2xl border border-violet-500/20 px-4 py-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.28)] sm:px-5 sm:py-4"
          >
            <div className="pointer-events-none absolute -right-6 top-1/2 hidden h-28 w-40 -translate-y-1/2 opacity-35 sm:block">
              <svg viewBox="0 0 240 180" fill="none" aria-hidden="true" className="h-full w-full">
                <rect x="132" y="48" width="70" height="90" rx="8" stroke="rgba(196,181,253,0.45)" strokeWidth="2" />
                <path d="M167 48V28" stroke="rgba(196,181,253,0.45)" strokeWidth="2" />
                <circle cx="167" cy="24" r="8" stroke="rgba(196,181,253,0.55)" strokeWidth="2" />
                <path
                  d="M40 120c18-28 42-40 70-42"
                  stroke="rgba(167,139,250,0.45)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M52 138h48l10-28H62l-10 28z" stroke="rgba(196,181,253,0.5)" strokeWidth="2" />
                <path d="M70 110v-18h12v18" stroke="rgba(196,181,253,0.5)" strokeWidth="2" />
              </svg>
            </div>

            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-violet-200 backdrop-blur">
                  <Clapperboard className="h-4 w-4" strokeWidth={1.5} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold tracking-tight text-white sm:text-[16px]">
                    Create a New Project
                  </h2>
                  <p className="mt-0.5 text-[12px] leading-snug text-violet-100/70">
                    Start a new story and let AI turn it into a complete video plan.
                  </p>
                </div>
              </div>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleOpenStyleModal}
                disabled={creating}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-xl bg-white px-3.5 py-2 text-[12px] font-semibold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                {creating ? 'Creating…' : 'Create New Project'}
              </motion.button>
            </div>
          </motion.section>

          <section>
            <div className="mb-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-semibold text-white">All Projects</h3>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium tabular-nums text-zinc-400">
                  {filteredProjects.length}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <label className="relative">
                  <span className="sr-only">Sort projects</span>
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value)}
                    className="appearance-none rounded-xl border border-white/8 bg-[#12151f] py-1.5 pl-2.5 pr-7 text-[11px] font-medium text-zinc-300 outline-none transition hover:border-violet-500/30 focus:border-violet-500/40"
                  >
                    <option value="recent">Recently Updated</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </label>

                <div className="inline-flex rounded-xl border border-white/8 bg-[#12151f] p-0.5">
                  <button
                    type="button"
                    aria-label="Grid view"
                    aria-pressed={viewMode === 'grid'}
                    onClick={() => setViewMode('grid')}
                    className={[
                      'rounded-lg p-1.5 transition',
                      viewMode === 'grid'
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'text-zinc-500 hover:text-zinc-200',
                    ].join(' ')}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="List view"
                    aria-pressed={viewMode === 'list'}
                    onClick={() => setViewMode('list')}
                    className={[
                      'rounded-lg p-1.5 transition',
                      viewMode === 'list'
                        ? 'bg-violet-500/20 text-violet-200'
                        : 'text-zinc-500 hover:text-zinc-200',
                    ].join(' ')}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((key) => (
                  <div
                    key={key}
                    className="animate-pulse overflow-hidden rounded-2xl border border-white/8 bg-[#12151f]"
                  >
                    <div className="aspect-[2/1] bg-white/5" />
                    <div className="space-y-2 p-2.5">
                      <div className="h-3 w-3/4 rounded bg-white/8" />
                      <div className="h-2.5 w-full rounded bg-white/5" />
                      <div className="h-2.5 w-1/2 rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 px-5 py-8 text-center">
                <p className="text-[14px] font-semibold text-rose-200">{loadError.title}</p>
                <p className="mx-auto mt-1.5 max-w-md text-[12px] leading-relaxed text-zinc-400">
                  {loadError.message}
                </p>
                <button
                  type="button"
                  className="mt-4 rounded-xl border border-rose-400/40 px-3.5 py-1.5 text-[12px] font-semibold text-rose-200 transition hover:bg-rose-500/10"
                  onClick={loadProjects}
                >
                  Try again
                </button>
              </div>
            ) : projects.length === 0 ? (
              <EmptyProjectsState onCreate={handleOpenStyleModal} />
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/12 bg-[#0f131c]/70 px-5 py-10 text-center">
                <p className="text-[13px] font-medium text-zinc-200">No projects match your search.</p>
                <p className="mt-1 text-[12px] text-zinc-500">Try a different title or clear the search.</p>
              </div>
            ) : (
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
                    : 'flex flex-col gap-2'
                }
              >
                {filteredProjects.map((item) => (
                  <ProjectCard
                    key={item.id}
                    project={item}
                    view={viewMode}
                    onOpen={handleOpen}
                    onDelete={handleDeleteClick}
                  />
                ))}

                {viewMode === 'grid' ? (
                  <button
                    type="button"
                    onClick={handleOpenStyleModal}
                    disabled={creating}
                    className="flex min-h-[156px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/12 bg-[#0f131c]/55 px-3 text-center transition hover:border-violet-500/35 hover:bg-violet-500/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-[#151922]">
                        <FolderPlus className="h-4 w-4 text-zinc-400" strokeWidth={1.4} />
                      </div>
                      <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-violet-300" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-zinc-200">Ready to create something amazing?</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">Click &quot;New Project&quot; to get started.</p>
                    </div>
                  </button>
                ) : null}
              </div>
            )}
          </section>
        </main>
      </div>

      <NewProjectStyleModal
        open={styleModalOpen}
        creating={creating}
        onCancel={handleCancelStyleModal}
        onConfirm={handleConfirmCreate}
      />

      <ProjectProcessorModal
        open={Boolean(processor)}
        projectId={processor?.projectId}
        projectName={processor?.projectName}
        startWith={processor?.startWith}
        style={processor?.style}
        story={processor?.story}
        screenplay={processor?.screenplay}
        onComplete={handleProcessorComplete}
        onDismiss={handleProcessorDismiss}
      />

      <DeleteProjectConfirmModal
        open={Boolean(pendingDelete)}
        projectTitle={pendingDelete?.title || BRAND.untitledProjectName}
        deleting={deleting}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />

      <ErrorModal
        open={Boolean(actionError?.message)}
        title={actionError?.title ?? 'Something went wrong'}
        message={actionError?.message ?? ''}
        onClose={() => setActionError(null)}
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
