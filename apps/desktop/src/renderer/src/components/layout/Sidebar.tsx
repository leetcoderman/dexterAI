import { useEffect } from 'react'
import { cn } from '@dexterai/shared-utils'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Plus,
  MessageSquare,
  Settings,
  Brain,
  Trash2,
  Compass,
  Library,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Home
} from 'lucide-react'
import { useAppStore } from '../../store'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-text-muted no-select">
      {children}
    </div>
  )
}

function SidebarLink({
  to,
  icon: Icon,
  label,
  className,
  collapsed,
  end
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  className?: string
  collapsed?: boolean
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-150',
          collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
          isActive
            ? 'bg-primary text-white shadow-glow'
            : 'text-text-secondary hover:text-text hover:bg-elevated',
          className
        )
      }
      title={collapsed ? label : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { conversations, loadConversations, sidebarCollapsed, toggleSidebar } = useAppStore()

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

  const collapsed = sidebarCollapsed

  return (
    <aside className={cn(
      "shrink-0 bg-sidebar-bg h-full flex flex-col border-r border-border-subtle transition-all duration-200",
      collapsed ? "w-14" : "w-56"
    )}>
      {/* Brand + Toggle */}
      <div className={cn(
        "h-14 flex items-center shrink-0 drag-region",
        collapsed ? "px-2 justify-center" : "px-5 justify-between"
      )}>
        {!collapsed && (
          <h1 className="text-base font-bold tracking-tight text-text no-drag no-select">
            <span className="text-primary">dexter</span>AI
          </h1>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-elevated transition-colors no-drag"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-text-muted" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-text-muted" />
          )}
        </button>
      </div>

      <div className={cn("space-y-1 pb-2", collapsed ? "px-1" : "px-2")}>
        {/* Home */}
        <SidebarLink
          to="/"
          icon={Home}
          label="Home"
          collapsed={collapsed}
          end
          className="mb-1"
        />

        {/* New Chat */}
        <button
          onClick={handleNewChat}
          className={cn(
            "flex items-center gap-2.5 w-full rounded-lg text-[13px] font-medium text-text-secondary hover:text-text hover:bg-elevated transition-all",
            collapsed ? "px-2 py-2 justify-center" : "px-3 py-2"
          )}
          title={collapsed ? "New Chat" : undefined}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && "New Chat"}
        </button>

        {/* Explore - Green Button */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 w-full rounded-lg text-[13px] font-bold transition-all border border-transparent",
              collapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2.5",
              isActive
                ? "bg-green-600 text-white shadow-lg shadow-green-600/20"
                : "bg-green-600/10 text-green-600 hover:bg-green-600 hover:text-white"
            )
          }
          title={collapsed ? "Explore" : undefined}
        >
          <Compass className="w-4 h-4" />
          {!collapsed && "Explore"}
        </NavLink>
      </div>

      <nav className={cn("flex-1 overflow-y-auto space-y-0.5", collapsed ? "px-1" : "px-2")}>
        {/* Conversations */}
        {!collapsed && <SectionLabel>Conversations</SectionLabel>}
        {conversations.slice(0, collapsed ? 5 : 15).map((conv) => {
          const isActive = location.pathname === `/chat/${conv.id}`
          return collapsed ? (
            <NavLink
              key={conv.id}
              to={`/chat/${conv.id}`}
              className={cn(
                'flex items-center justify-center px-2 py-2 rounded-lg transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:text-text hover:bg-elevated'
              )}
              title={conv.title || 'New Conversation'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </NavLink>
          ) : (
            <NavLink
              key={conv.id}
              to={`/chat/${conv.id}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 group',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-text-secondary hover:text-text hover:bg-elevated'
              )}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{conv.title || 'New Conversation'}</span>
              <button
                onClick={(e) => handleDeleteConv(conv.id, e)}
                className={cn(
                  'p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0',
                  isActive ? 'hover:bg-primary/20 text-primary' : 'hover:bg-red-500/10 hover:text-red-500'
                )}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </NavLink>
          )
        })}
        {!collapsed && conversations.length > 15 && (
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-text-muted hover:text-primary transition-colors mt-1"
          >
            Show more ({conversations.length - 15} hidden)...
          </NavLink>
        )}

        {/* Connect API keys */}
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <SidebarLink
            to="/providers"
            icon={Zap}
            label="Connect API keys"
            collapsed={collapsed}
            className="hover:bg-orange-500/10 hover:text-orange-500"
          />
        </div>

        <SidebarLink to="/catalogue" icon={Library} label="Model Catalogue" collapsed={collapsed} />
        <SidebarLink to="/memory" icon={Brain} label="Memory" collapsed={collapsed} />
      </nav>

      {/* Footer */}
      <div className={cn("py-3 border-t border-border-subtle shrink-0", collapsed ? "px-1" : "px-2")}>
        <SidebarLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      </div>
    </aside>
  )
}
