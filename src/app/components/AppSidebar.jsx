import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clapperboard,
  Crown,
  FolderKanban,
  LayoutTemplate,
  Palette,
  Users,
  MapPinned,
  Settings,
  ChevronUp,
  LogOut,
  X,
} from 'lucide-react'
import { BRAND } from '../../config/branding'

const NAV_ITEMS = [
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'templates', label: 'Templates', icon: LayoutTemplate },
  { id: 'styles', label: 'Styles', icon: Palette },
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'environments', label: 'Environments', icon: MapPinned },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function userInitials(user) {
  const name = user?.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  const email = user?.email?.trim()
  if (email) return email.slice(0, 2).toUpperCase()
  return BRAND.avatarInitial
}

export default function AppSidebar({
  user,
  activeId = 'projects',
  onNavigate,
  onLogout,
  mobileOpen = false,
  onMobileClose,
}) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  useEffect(() => {
    if (!profileOpen) return undefined

    const onPointerDown = (event) => {
      if (!profileRef.current?.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setProfileOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileOpen])

  const handleNav = (id) => {
    onNavigate?.(id)
    if (id === 'settings') {
      setProfileOpen(true)
      return
    }
    onMobileClose?.()
  }

  const sidebarBody = (
    <aside className="flex h-full w-[212px] flex-col border-r border-white/8 bg-[#0b0e14] screenly-glass">
      <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 shadow-[0_0_14px_rgba(139,92,246,0.3)]">
            <Clapperboard className="h-3.5 w-3.5 text-white" strokeWidth={1.75} />
          </span>
          <span className="text-[14px] font-semibold tracking-tight text-white lowercase">
            {BRAND.name.toLowerCase()}
          </span>
        </div>
        {onMobileClose ? (
          <button
            type="button"
            className="rounded-md p-1 text-zinc-400 transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={onMobileClose}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="mt-4 flex flex-1 flex-col gap-0.5 px-2.5" aria-label="Main">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === activeId
          return (
            <motion.button
              key={item.id}
              type="button"
              whileHover={{ x: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleNav(item.id)}
              className={[
                'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors',
                isActive
                  ? 'screenly-active-nav text-white'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
              <span>{item.label}</span>
            </motion.button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-2 px-2.5 pb-3 pt-3">
        <div className="rounded-xl border border-white/8 bg-[#12151f]/90 p-2.5">
          <div className="mb-2 flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
              <Crown className="h-3 w-3" strokeWidth={2} />
            </span>
            <span className="text-[11px] font-semibold text-zinc-100">Pro Plan</span>
          </div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-zinc-400">
            <span>Credits</span>
            <span className="font-medium text-zinc-200">8,450</span>
          </div>
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[84%] rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" />
          </div>
          <button
            type="button"
            className="screenly-gradient-btn w-full rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110"
          >
            Upgrade Plan
          </button>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-xl border border-white/8 bg-[#12151f]/80 px-2 py-1.5 text-left transition hover:border-violet-500/30 hover:bg-[#161a26]"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            onClick={() => setProfileOpen((open) => !open)}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-[10px] font-semibold text-white">
              {userInitials(user)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold text-zinc-100">
                {user?.name || 'Screenly User'}
              </span>
              <span className="block truncate text-[10px] text-zinc-500">
                {user?.email || 'signed in'}
              </span>
            </span>
            <ChevronUp
              className={[
                'h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform',
                profileOpen ? 'rotate-0' : 'rotate-180',
              ].join(' ')}
            />
          </button>

          <AnimatePresence>
            {profileOpen ? (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.14 }}
                role="menu"
                className="absolute bottom-[calc(100%+6px)] left-0 right-0 overflow-hidden rounded-lg border border-white/10 bg-[#151922] shadow-xl"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-[12px] text-zinc-300 transition hover:bg-white/5 hover:text-white"
                  onClick={() => {
                    setProfileOpen(false)
                    onLogout?.()
                  }}
                >
                  <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Log out
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      <div className="hidden h-full shrink-0 lg:block">{sidebarBody}</div>

      <AnimatePresence>
        {mobileOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-label="Close menu overlay"
              onClick={onMobileClose}
            />
            <motion.div
              className="absolute inset-y-0 left-0"
              initial={{ x: -220 }}
              animate={{ x: 0 }}
              exit={{ x: -220 }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            >
              {sidebarBody}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  )
}
