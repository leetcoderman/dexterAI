import { useEffect } from 'react'
import { cn } from '@dexterai/shared-utils'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Image, Mic, Volume2, Library, Settings, Brain, Trash2 } from 'lucide-react'
import { useAppStore } from '../../store'

const OpenAILogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.28 10.42a8.55 8.55 0 0 0-1.89-6.32 8.5 8.5 0 0 0-7.85-2.79 8.52 8.52 0 0 0-4.63-2.67 8.56 8.56 0 0 0-8.6 3.84 8.55 8.55 0 0 0-1.25 6.44 8.5 8.5 0 0 0 2.22 8.01 8.52 8.52 0 0 0 11.23 2.14A8.56 8.56 0 0 0 22.28 10.42Zm-2.31 5.92a6.45 6.45 0 0 1-5.11 2.37v-4.14A3.16 3.16 0 0 0 12 11.45V4.65a6.47 6.47 0 0 1 7.97 11.69ZM8.25 21.09a6.44 6.44 0 0 1-3.66-3.8l4.48-1.74a3.14 3.14 0 0 0 1.25 1v7.6a6.45 6.45 0 0 1-2.07-3.06ZM3.7 13.9a6.46 6.46 0 0 1-.36-5.83l3.64 3a3.15 3.15 0 0 0 .54 1.55l-3.32 2.5a6.45 6.45 0 0 1-.5-1.22Zm4.25-9.67A6.45 6.45 0 0 1 12 2.12v4.14a3.15 3.15 0 0 0 2.85 3.12v-6.8a6.47 6.47 0 0 1-6.9 7.65ZM15.75 3.9A6.45 6.45 0 0 1 19.4 7.7l-4.48 1.74a3.15 3.15 0 0 0-1.25-1V.82a6.44 6.44 0 0 1 2.08 3.08ZM19.8 11.3v.01a6.46 6.46 0 0 1 .36 5.82l-3.64-3a3.15 3.15 0 0 0-.54-1.55l3.32-2.5a6.44 6.44 0 0 1 .5 1.22Z" />
  </svg>
)

const AnthropicLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.92.5H23.5L14.77 23.5H8.2L16.92.5ZM5 14L2 23.5H9L11.5 14H5Z" />
  </svg>
)

const GoogleLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

const DeepgramLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11 2h2v20h-2V2zM6 6h2v12H6V6zM16 8h2v8h-2V8zM1 10h2v4H1v-4zM21 11h2v2h-2v-2z" />
  </svg>
)

const NvidiaLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.5 19h4.5v-9.5l7.5 10.5h6v-15.5h-4.5v9.5l-7.5-10.5h-6z" />
  </svg>
)

const PROVIDERS = [
  { label: 'OpenAI', id: 'openai', icon: OpenAILogo },
  { label: 'Anthropic', id: 'anthropic', icon: AnthropicLogo },
  { label: 'Deepgram', id: 'deepgram', icon: DeepgramLogo },
  { label: 'Google', id: 'google', icon: GoogleLogo },
  { label: 'NVIDIA NIM', id: 'nvidia_nim', icon: NvidiaLogo }
]

const WORKSPACE_LINKS = [
  { label: 'Image Gen', icon: Image, category: 'image_generation' },
  { label: 'Speech', icon: Mic, category: 'audio_transcription' },
  { label: 'TTS', icon: Volume2, category: 'text_to_speech' }
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted">
      {children}
    </div>
  )
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  end
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  end?: boolean
}) {
  const location = useLocation()

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => {
        let actuallyActive = false
        if (to.includes('?')) {
          actuallyActive = location.pathname + location.search === to
        } else {
          actuallyActive = isActive && !location.search
        }

        return cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
          actuallyActive
            ? 'bg-primary text-white shadow-glow'
            : 'text-text-secondary hover:text-text hover:bg-elevated'
        )
      }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { conversations, loadConversations } = useAppStore()

  useEffect(() => {
    loadConversations()
  }, [])

  const handleNewChat = async () => {
    const conv = await window.dexterai.conversations.create()
    if (conv) navigate(`/chat/${conv.id}`)
  }

  const handleDeleteConv = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    await window.dexterai.conversations.delete(id)
    loadConversations()
    if (location.pathname === `/chat/${id}`) navigate('/')
  }

  return (
    <aside className="w-56 shrink-0 bg-sidebar-bg h-full flex flex-col border-r border-border-subtle">
      {/* Brand */}
      <div className="h-14 flex items-center px-5 shrink-0 drag-region">
        <h1 className="text-base font-bold tracking-tight text-text no-drag">
          <span className="text-primary">dexter</span>AI
        </h1>
      </div>

      {/* New Chat */}
      <div className="px-2 mb-1">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-[13px] font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {/* Conversations */}
        <SectionLabel>Conversations</SectionLabel>
        {conversations.slice(0, 20).map((conv) => {
          const isActive = location.pathname === `/chat/${conv.id}`
          return (
            <NavLink
              key={conv.id}
              to={`/chat/${conv.id}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-primary text-white shadow-glow'
                  : 'text-text-secondary hover:text-text hover:bg-elevated'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{conv.title || 'New Conversation'}</span>
              <button
                onClick={(e) => handleDeleteConv(conv.id, e)}
                className={cn(
                  'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                  isActive ? 'hover:bg-white/20' : 'hover:bg-red-500/10 hover:text-red-500'
                )}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </NavLink>
          )
        })}
        {conversations.length > 20 && (
          <NavLink
            to="/chat"
            className="px-3 py-1.5 text-[11px] text-text-muted hover:text-text transition-colors"
          >
            View all ({conversations.length})...
          </NavLink>
        )}

        {/* Workspaces */}
        <SectionLabel>Workspaces</SectionLabel>
        {WORKSPACE_LINKS.map(({ label, icon, category }) => (
          <SidebarLink
            key={category}
            to={`/catalogue?category=${category}`}
            icon={icon}
            label={label}
          />
        ))}

        {/* Catalogue */}
        <SectionLabel>Browse</SectionLabel>
        <SidebarLink to="/catalogue" icon={Library} label="Model Catalogue" />
        <SidebarLink to="/explore" icon={Library} label="Explore" end />

        {/* Providers */}
        <SectionLabel>Providers</SectionLabel>
        {PROVIDERS.map(({ label, id, icon }) => (
          <SidebarLink key={id} to={`/provider/${id}`} icon={icon} label={label} />
        ))}

        {/* Memory */}
        <SectionLabel>Tools</SectionLabel>
        <SidebarLink to="/memory" icon={Brain} label="Memory" />
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-border-subtle shrink-0">
        <SidebarLink to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  )
}
