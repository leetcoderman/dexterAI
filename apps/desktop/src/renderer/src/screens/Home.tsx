import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Zap, Library, Settings, Code2, ArrowRight } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'

const DASHBOARD_ACTIONS = [
  {
    id: 'new_chat',
    label: '+ New Chat',
    description: 'Start a fresh conversation with any AI model.',
    icon: Plus,
    path: '/chat/new', // handled by onClick
    color: 'text-primary',
    bg: 'bg-primary/10'
  },
  {
    id: 'code',
    label: 'Code',
    description: 'Open the agentic coding workspace with file access.',
    icon: Code2,
    path: '/code',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10'
  },
  {
    id: 'conversations',
    label: 'Conversations',
    description: 'Browser and search your past chat history.',
    icon: MessageSquare,
    path: '/chat',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10'
  },
  {
    id: 'providers',
    label: 'Connect API Keys',
    description: 'Manage keys for OpenAI, Anthropic, Gemini, and more.',
    icon: Zap,
    path: '/providers',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10'
  },
  {
    id: 'catalogue',
    label: 'Model Catalogue',
    description: 'Explore 190+ supported models across all providers.',
    icon: Library,
    path: '/catalogue',
    color: 'text-teal-400',
    bg: 'bg-teal-400/10'
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Configure appearance, zoom, and data management.',
    icon: Settings,
    path: '/settings',
    color: 'text-gray-400',
    bg: 'bg-gray-400/10'
  }
]

export default function Home() {
  const navigate = useNavigate()

  const handleAction = async (action: typeof DASHBOARD_ACTIONS[0]) => {
    if (action.id === 'new_chat') {
      const conv = await window.dexterai.conversations.create()
      if (conv) navigate(`/chat/${conv.id}`)
    } else {
      navigate(action.path)
    }
  }

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      {/* Hero Section */}
      <div className="px-8 pt-12 pb-8 max-w-6xl mx-auto w-full">
        <div className="flex flex-col items-center text-center space-y-4 animate-fade-in">
          <h1 className="text-4xl font-extrabold tracking-tight text-text sm:text-5xl">
            Welcome to <span className="text-primary">dexterAI</span>
          </h1>
          <p className="text-base text-text-muted max-w-2xl leading-relaxed">
            Your unified workbench for cutting-edge AI. Prompt, code, and compare models with project-aware tools and premium performance.
          </p>
        </div>
      </div>

      {/* Grid Section */}
      <div className="flex-1 px-8 pb-12 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {DASHBOARD_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className={cn(
                'group relative flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-300 border-2',
                'bg-surface border-border-subtle hover:border-primary/30 hover:shadow-glow-primary/5'
              )}
            >
              {/* Icon Container */}
              <div className={cn(
                "w-16 h-16 mb-6 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300",
                action.bg,
                action.color
              )}>
                <action.icon className="w-8 h-8" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-text mb-2 group-hover:text-primary transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed px-2">
                {action.description}
              </p>

              {/* Action CTA */}
              <div className="mt-8 flex items-center gap-2 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
