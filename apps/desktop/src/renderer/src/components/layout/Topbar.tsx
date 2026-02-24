import { useLocation, useParams } from 'react-router-dom'
import { useAppStore } from '../../store'

const ROUTE_TITLES: Record<string, string> = {
  '/': 'Conversations',
  '/chat': 'Conversations',
  '/explore': 'Use-case Gallery',
  '/catalogue': 'Model Catalogue',
  '/memory': 'Memory',
  '/settings': 'Settings'
}

export default function Topbar() {
  const location = useLocation()
  const { providerId, modelId, conversationId } = useParams()
  const connectedProviders = useAppStore((s) => s.connectedProviders)
  const conversations = useAppStore((s) => s.conversations)

  let title = ROUTE_TITLES[location.pathname] ?? 'dexterAI'
  if (providerId) title = `Connect ${providerId.charAt(0).toUpperCase() + providerId.slice(1)}`
  if (modelId) title = modelId
  if (conversationId) {
    const conv = conversations.find((c) => c.id === conversationId)
    title = conv?.title || 'Chat'
  }

  const count = connectedProviders.length

  return (
    <header className="h-12 shrink-0 border-b border-border-subtle bg-sidebar-bg flex items-center justify-between px-5 drag-region z-10">
      <h2 className="text-sm font-semibold text-text-secondary truncate max-w-xs no-drag">
        {title}
      </h2>
      <div className="flex items-center gap-2 no-drag">
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
            count > 0
              ? 'bg-[rgba(35,165,90,0.1)] text-success'
              : 'bg-elevated text-text-muted'
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              count > 0 ? 'bg-success' : 'bg-text-muted'
            )}
          />
          {count} Connected
        </div>
      </div>
    </header>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
