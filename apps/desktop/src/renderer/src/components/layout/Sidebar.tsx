import { cn } from '@dexterai/shared-utils'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Plus,
  MessageSquare,
  Settings,
  Brain,
  Compass,
  Library,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Code2
} from 'lucide-react'
import { useAppStore } from '../../store'


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
  const { sidebarCollapsed, toggleSidebar } = useAppStore()


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
          onClick={async () => {
            const conv = await window.dexterai.conversations.create()
            if (conv) navigate(`/chat/${conv.id}`)
          }}
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
        <SidebarLink
          to="/chat"
          icon={MessageSquare}
          label="Conversations"
          collapsed={collapsed}
        />

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
        <SidebarLink to="/code" icon={Code2} label="Code" collapsed={collapsed} />
      </nav>

      {/* Footer */}
      <div className={cn("py-3 border-t border-border-subtle shrink-0", collapsed ? "px-1" : "px-2")}>
        <SidebarLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      </div>
    </aside>
  )
}
