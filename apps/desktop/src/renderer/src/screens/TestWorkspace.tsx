import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Bot, LayoutPanelLeft, ActivitySquare, Plug } from 'lucide-react'
import { useAppStore } from '../store'
import { cn } from '@dexterai/shared-utils'
import CodeGenWorkspace from './workspaces/CodeGenWorkspace'
import ImageGenWorkspace from './workspaces/ImageGenWorkspace'
import TextGenWorkspace from './workspaces/TextGenWorkspace'
import ASRWorkspace from './workspaces/ASRWorkspace'
import TTSWorkspace from './workspaces/TTSWorkspace'
import EvaluationDrawer from '../components/EvaluationDrawer'
import HistoryTab from '../components/HistoryTab'

const TABS = [
  { id: 'test', label: 'Test' },
  { id: 'history', label: 'History' },
  { id: 'eval', label: 'Evaluation' }
] as const

function deriveCategory(modelId: string): string {
  if (modelId.includes('code')) return 'code_generation'
  if (modelId.includes('image') || modelId.includes('dall')) return 'image_generation'
  if (modelId.includes('aura')) return 'text_to_speech'
  if (modelId.includes('audio') || modelId.includes('whisper') || modelId.includes('nova'))
    return 'audio_transcription'
  return 'text_generation'
}

export default function TestWorkspaceShell() {
  const params = useParams()
  const modelId = params['*'] || params.modelId
  const navigate = useNavigate()
  const location = useLocation()
  const connectedProviders = useAppStore((s) => s.connectedProviders)

  const [activeTab, setActiveTab] = useState<string>('test')
  const [isCompareMode, setIsCompareMode] = useState(false)

  const providerId: string = (location.state as any)?.providerId ?? ''
  const providerName = providerId
    ? providerId.charAt(0).toUpperCase() + providerId.slice(1)
    : 'Unknown Provider'

  const isConnected = providerId
    ? connectedProviders.includes(providerId)
    : connectedProviders.length > 0

  if (!isConnected && providerId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-elevated flex items-center justify-center">
          <Plug className="w-8 h-8 text-text-muted" />
        </div>
        <div className="text-center">
          <p className="text-sm text-text-secondary mb-1">
            Connect <span className="font-semibold text-text">{providerName}</span> to test this
            model.
          </p>
        </div>
        <button onClick={() => navigate(`/provider/${providerId}`)} className="btn-primary text-sm">
          Connect {providerName}
        </button>
      </div>
    )
  }

  const category = deriveCategory(modelId ?? '')

  const renderWorkspace = () => {
    const props = { providerId, modelId: modelId ?? '' }
    switch (category) {
      case 'code_generation':
        return <CodeGenWorkspace {...props} />
      case 'image_generation':
        return <ImageGenWorkspace {...props} />
      case 'audio_transcription':
        return <ASRWorkspace {...props} />
      case 'text_to_speech':
        return <TTSWorkspace {...props} />
      default:
        return <TextGenWorkspace {...props} />
    }
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border-subtle bg-sidebar-bg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text">{modelId}</h1>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
              <span>{providerName}</span>
              {providerId && (
                <>
                  <span className="w-1 h-1 rounded-full bg-text-muted" />
                  <button
                    onClick={() => navigate(`/provider/${providerId}`)}
                    className="text-primary hover:underline"
                  >
                    Re-verify
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsCompareMode(!isCompareMode)}
          className={cn(
            'btn-ghost text-xs flex items-center gap-1.5',
            isCompareMode && 'bg-primary/10 text-primary'
          )}
        >
          <LayoutPanelLeft className="w-3.5 h-3.5" />
          Compare
        </button>
      </header>

      {/* Tab bar */}
      <div className="flex border-b border-border-subtle shrink-0 bg-sidebar-bg">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-5 py-2.5 text-xs font-semibold transition-all border-b-2',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'test' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">{renderWorkspace()}</div>
            <EvaluationDrawer modelId={modelId ?? ''} />
          </div>
        )}
        {activeTab === 'history' && <HistoryTab modelId={modelId ?? ''} category={category} />}
        {activeTab === 'eval' && (
          <div className="flex-1 p-6 overflow-y-auto flex flex-col items-center justify-center text-text-muted animate-fade-in">
            <ActivitySquare className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Run a test first to see evaluation metrics here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
