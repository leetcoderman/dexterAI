import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Zap, Library, Settings, Code2, ArrowRight, TriangleAlert } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import SecurityBanner from '../components/common/SecurityBanner'
import logo from '../assets/logo.jpeg'
import { useAppStore } from '../store'

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
  const { showExperimentalFeatures } = useAppStore()
  const navigate = useNavigate()

  const handleAction = async (action: (typeof DASHBOARD_ACTIONS)[0]) => {
    if (action.id === 'code' && !showExperimentalFeatures) return

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
      <div className="px-8 pt-12 pb-8 max-w-6xl mx-auto w-full flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-20 h-20 rounded-[2rem] bg-surface border border-border-subtle p-1 shadow-glow-primary/10 overflow-hidden shrink-0 mb-6">
            <img src={logo} alt="dexterAI" className="w-full h-full object-cover rounded-[1.75rem]" />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-black tracking-tighter text-text">
              Welcome to <span className="text-primary">dexterAI</span>
            </h1>
            <p className="text-lg text-text-muted max-w-2xl font-medium mx-auto">
              Your local intelligence orchestrator. Ready to build, test, and deploy.
            </p>
          </div>
        </div>
        <SecurityBanner className="mt-8 w-full max-w-3xl" />
      </div>

      {/* Grid Section */}
      <div className="flex-1 px-8 pb-12 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-slide-up">
          {DASHBOARD_ACTIONS.map((action) => {
            const isDisabled = action.id === 'code' && !showExperimentalFeatures
            return (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isDisabled}
                className={cn(
                  'group relative flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-300 border-2',
                  'bg-surface border-border-subtle hover:border-primary/30 hover:shadow-glow-primary/5',
                  isDisabled && 'opacity-50 grayscale cursor-not-allowed hover:border-border-subtle hover:shadow-none'
                )}
              >
                {/* Icon Container */}
                <div
                  className={cn(
                    'w-16 h-16 mb-6 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300',
                    !isDisabled && 'group-hover:scale-110',
                    action.bg,
                    action.color
                  )}
                >
                  <action.icon className="w-8 h-8" />
                </div>

                {/* Content */}
                <h3
                  className={cn(
                    'text-lg font-bold text-text mb-2 transition-colors',
                    !isDisabled && 'group-hover:text-primary'
                  )}
                >
                  {action.label}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed px-2">{action.description}</p>

                {/* Action CTA */}
                {!isDisabled && (
                  <div className="mt-8 flex items-center gap-2 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 duration-300">
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}

                {/* Warning Tooltip for Code */}
                {action.id === 'code' && (
                  <div className="absolute top-4 right-4 group/warn">
                    <TriangleAlert className="w-5 h-5 text-amber-500 cursor-help" />
                    <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-surface border border-amber-500/30 rounded-xl shadow-xl opacity-0 group-hover/warn:opacity-100 transition-opacity pointer-events-none z-50">
                      <p className="text-[10px] leading-tight text-amber-500 font-bold text-left italic">
                        EXPERIMENTAL FEATURE: The Code workspace is currently under development, is highly
                        untested and may showcase various errors.
                      </p>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
