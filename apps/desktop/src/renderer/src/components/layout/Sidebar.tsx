import { useState } from 'react'
import { cn } from '@dexterai/shared-utils'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  Plus,
  MessageSquare,
  Brain,
  Compass,
  Library,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  Home,
  Code2,
  TriangleAlert,
  Settings,
  Bug,
  Gift,
  Info
} from 'lucide-react'
import { useAppStore } from '../../store'
import logo from '../../assets/logo.jpeg'

function SidebarLink({
  to,
  icon: Icon,
  label,
  className,
  collapsed,
  end,
  badge,
  onHover
}: {
  to: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  className?: string
  collapsed?: boolean
  end?: boolean
  badge?: React.ReactNode
  onHover?: (content: React.ReactNode | null) => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onMouseEnter={() => onHover?.(badge)}
      onMouseLeave={() => onHover?.(null)}
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
      title={collapsed ? label : ''}
    >
      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
      {!collapsed && <span className="truncate flex-1">{label}</span>}
      {!collapsed && badge && (
        <TriangleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0" />
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const navigate = useNavigate()
  const { sidebarCollapsed, toggleSidebar, showExperimentalFeatures } = useAppStore()
  const [hoveredBadge, setHoveredBadge] = useState<React.ReactNode | null>(null)

  const collapsed = sidebarCollapsed

  return (
    <aside
      className={cn(
        'bg-sidebar-bg h-full flex flex-col border-r border-border-subtle transition-all duration-300 ease-in-out',
        collapsed ? 'w-[60px]' : 'w-[260px]'
      )}
    >
      {/* Brand + Toggle */}
      <div
        className={cn(
          'h-12 flex items-center shrink-0 drag-region border-b border-border-subtle transition-all',
          collapsed ? 'justify-center' : 'px-4 justify-between'
        )}
      >
        <div className="flex items-center gap-3 no-drag no-select">
          <div className="w-8 h-8 rounded-lg bg-surface border border-border-subtle p-0.5 overflow-hidden shrink-0">
            <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-md" />
          </div>
          {!collapsed && (
            <h1 className="text-base font-bold tracking-tight text-text">
              <span className="text-primary">dexter</span>AI
            </h1>
          )}
        </div>
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-lg hover:bg-elevated transition-colors no-drag"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-text-muted" />
          ) : (
            <PanelLeftClose className="w-4 h-4 text-text-muted" />
          )}
        </button>
      </div>

      <div className={cn('space-y-1 pb-2', collapsed ? 'px-1' : 'px-2')}>
        {/* Home */}
        <SidebarLink to="/" icon={Home} label="Home" collapsed={collapsed} end className="mb-1" />

        {/* New Chat */}
        <button
          onClick={async () => {
            const conv = await window.dexterai.conversations.create()
            if (conv) navigate(`/chat/${conv.id}`)
          }}
          className={cn(
            'flex items-center gap-2.5 w-full rounded-lg text-[13px] font-medium text-text-secondary hover:text-text hover:bg-elevated transition-all',
            collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2'
          )}
          title={collapsed ? 'New Chat' : undefined}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && 'New Chat'}
        </button>

        {/* Explore - Green Button */}
        <NavLink
          to="/explore"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 w-full rounded-lg text-[13px] font-bold transition-all border border-transparent',
              collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
              isActive
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/20'
                : 'bg-green-600/10 text-green-600 hover:bg-green-600 hover:text-white'
            )
          }
          title={collapsed ? 'Explore' : undefined}
        >
          <Compass className="w-4 h-4" />
          {!collapsed && 'Explore'}
        </NavLink>
      </div>

      <nav className={cn('flex-1 space-y-0.5 overflow-hidden', collapsed ? 'px-1' : 'px-2')}>
        {/* Conversations */}
        <SidebarLink to="/chat" icon={MessageSquare} label="Conversations" collapsed={collapsed} />

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
        <SidebarLink
          to="/nvidia-fleet"
          icon={Zap}
          label="Nvidia Intelligence Fleet"
          collapsed={collapsed}
          className="text-white hover:bg-[#76b900]/20 hover:text-[#76b900]"
        />
        <div className={cn(!showExperimentalFeatures && 'opacity-40 grayscale pointer-events-none')}>
          <SidebarLink
            to="/memory"
            icon={Brain}
            label="Memory"
            collapsed={collapsed}
            onHover={setHoveredBadge}
            badge={
              <p className="text-[10px] leading-tight text-amber-500 font-bold text-left italic">
                EXPERIMENTAL: The Memory feature is under development. It extracts key facts from conversations to provide long-term context.
              </p>
            }
          />
          <SidebarLink
            to="/code"
            icon={Code2}
            label="Code"
            collapsed={collapsed}
            onHover={setHoveredBadge}
            badge={
              <p className="text-[10px] leading-tight text-amber-500 font-bold text-left italic">
                EXPERIMENTAL FEATURE: The Code workspace is currently under development, is highly untested and may showcase various errors.
              </p>
            }
          />
        </div>
      </nav>

      {/* Footer & Info Area */}
      <div
        className={cn('mt-auto py-3 border-t border-border-subtle shrink-0', collapsed ? 'px-1' : 'px-2')}
      >
        {/* Experimental Info Box (Inline) */}
        {!collapsed && hoveredBadge && (
          <div className="mb-3 p-3 bg-surface border border-amber-500/30 rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
            {hoveredBadge}
          </div>
        )}

        <SidebarLink
          to="/report-bug"
          icon={Bug}
          label="Report a Bug"
          collapsed={collapsed}
          className="text-red-500 hover:bg-red-500/10 font-bold"
        />
        <NavLink
          to="/free-keys"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg text-[13px] font-bold transition-all duration-300 border border-transparent mb-1 group relative overflow-hidden',
              collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5',
              isActive
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white'
            )
          }
          title={collapsed ? 'Free Keys Guide' : ''}
        >
          <Gift className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110")} />
          {!collapsed && <span className="truncate flex-1">Free Keys Guide</span>}
        </NavLink>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-lg text-[13px] font-bold transition-all duration-300 border border-transparent mb-1 group relative overflow-hidden',
              collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5',
              isActive
                ? 'bg-gradient-to-r from-indigo-600 to-rose-500 text-white shadow-lg shadow-indigo-600/20'
                : 'bg-gradient-to-r from-indigo-600/10 to-rose-500/10 text-indigo-500 hover:from-indigo-600 hover:to-rose-500 hover:text-white'
            )
          }
          title={collapsed ? 'About & Security' : ''}
        >
          <Info className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", !collapsed && "animate-pulse")} />
          {!collapsed && <span className="truncate flex-1">About & Security</span>}
          {!collapsed && (
            <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[9px] font-black uppercase tracking-tighter shrink-0 animate-bounce">
              New
            </span>
          )}
        </NavLink>
        <SidebarLink to="/settings" icon={Settings} label="Settings" collapsed={collapsed} />
      </div>
    </aside>
  )
}
