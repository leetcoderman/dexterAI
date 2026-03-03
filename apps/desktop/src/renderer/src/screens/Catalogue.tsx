import { useState, useEffect, useMemo } from 'react'
import { Search, Info, ChevronRight, Sparkles, Brain, Key } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import SecurityBanner from '../components/common/SecurityBanner'
import { useAppStore } from '../store'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RegistryModel } from '@dexterai/registry-types'

const PROVIDER_CONFIG = [
  { id: 'openai', label: 'OpenAI', icon: Sparkles },
  { id: 'anthropic', label: 'Anthropic', icon: Sparkles },
  { id: 'google', label: 'Google Gemini', icon: Sparkles },
  { id: 'nvidia_nim', label: 'NVIDIA NIM', icon: Sparkles },
  { id: 'github', label: 'GitHub Models', icon: Sparkles },
  { id: 'deepgram', label: 'Deepgram', icon: Sparkles }
]

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  anthropic: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  nvidia_nim: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  github: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  deepgram: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
}

export default function Catalogue() {
  const [models, setModels] = useState<RegistryModel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') ?? ''

  const [activeProvider, setActiveProvider] = useState<string | null>(
    searchParams.get('provider') ?? null
  )
  const [showReadyOnly, setShowReadyOnly] = useState(false)

  const connectedProviders = useAppStore((s) => s.connectedProviders)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchModels() {
      setLoading(true)
      try {
        const data = await window.dexterai.registry.getModels()
        setModels(data)
      } catch (e) {
        console.error('Failed to fetch models', e)
      } finally {
        setLoading(false)
      }
    }
    fetchModels()
  }, [])

  const filtered = useMemo(() => {
    const grouped = new Map<string, RegistryModel & { providers: string[] }>()
    for (const m of models) {
      const matchKey = m.name.toLowerCase().trim()
      if (!grouped.has(matchKey)) {
        grouped.set(matchKey, { ...m, providers: [m.provider_id] })
      } else {
        const existing = grouped.get(matchKey)!
        if (!existing.providers.includes(m.provider_id)) {
          existing.providers.push(m.provider_id)
        }
      }
    }
    let list = Array.from(grouped.values())

    if (categoryFilter) list = list.filter((m) => m.category === categoryFilter)
    if (activeProvider) list = list.filter((m) => m.providers.includes(activeProvider))
    if (showReadyOnly)
      list = list.filter((m) => m.providers.some((p) => connectedProviders.includes(p)))

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((m) => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
    }
    return list
  }, [models, categoryFilter, searchQuery, activeProvider, showReadyOnly, connectedProviders])

  const handleModelClick = (model: RegistryModel & { providers: string[] }) => {
    const connectedProv =
      model.providers.find((p) => connectedProviders.includes(p)) || model.providers[0]
    navigate(`/test/${encodeURIComponent(model.id)}`, { state: { providerId: connectedProv } })
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Model Catalogue</h1>
              <p className="text-sm text-text-muted">
                Browse and test available AI models across your connected providers.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <SecurityBanner compact className="hidden lg:flex" />
              <button
                onClick={() => setShowReadyOnly(!showReadyOnly)}
                className="flex items-center gap-3 bg-surface border border-border-subtle rounded-xl px-4 py-2.5 hover:border-primary/30 transition-all shadow-sm group"
                title="Filter by locally connected providers"
              >
                <span className="text-[13px] font-bold text-text-secondary select-none">
                  Ready Models
                </span>
                <div
                  className={cn(
                    'w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0',
                    showReadyOnly ? 'bg-primary' : 'bg-black/30 border border-border-subtle'
                  )}
                >
                  <div
                    className={cn(
                      'absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
                      showReadyOnly ? 'translate-x-5' : 'translate-x-0'
                    )}
                  />
                </div>
              </button>

              <div className="flex items-center gap-2 bg-elevated border border-border-subtle rounded-xl px-4 py-2.5 shrink-0 focus-within:border-primary/50 transition-all shadow-sm">
                <Search className="w-4.5 h-4.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-56 text-text placeholder:text-text-muted"
                />
              </div>
            </div>
          </div>

          {/* Provider Filter Bar */}
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => setActiveProvider(null)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all border',
                activeProvider === null
                  ? 'bg-primary text-white border-primary shadow-glow'
                  : 'bg-surface text-text-secondary border-border hover:border-gray-500'
              )}
            >
              All Models
            </button>
            {PROVIDER_CONFIG.map((p) => {
              const isConnected = connectedProviders.includes(p.id)
              const isActive = activeProvider === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveProvider(p.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border group',
                    isActive
                      ? PROVIDER_COLORS[p.id] + ' border-current shadow-lg shadow-current/5'
                      : 'bg-surface text-text-secondary border-border hover:border-gray-500'
                  )}
                >
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isConnected
                        ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                        : 'bg-gray-500'
                    )}
                  />
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-text-muted animate-pulse">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
            <p className="text-sm">Fetching catalogue...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-text-muted bg-surface/50 rounded-3xl border border-dashed border-border-subtle">
            <Sparkles className="w-10 h-10 mb-4 opacity-10" />
            <p className="text-sm font-medium">No matches found in this view.</p>
            <button
              onClick={() => {
                setActiveProvider(null)
                setSearchQuery('')
              }}
              className="mt-4 text-xs font-bold text-primary hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filtered.map((model) => {
              return (
                <button
                  key={`${model.id}-${model.category}`}
                  onClick={() => handleModelClick(model)}
                  className="w-full flex items-center gap-5 px-5 py-4 rounded-2xl bg-surface border border-border-subtle hover:border-primary/40 hover:bg-elevated/50 transition-all duration-200 group text-left shadow-sm hover:shadow-md"
                >
                  {/* Model Identity */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'text-[15px] font-bold text-text truncate group-hover:text-primary transition-colors',
                          (model as any).isPremium && 'line-through opacity-50'
                        )}
                      >
                        {model.name}
                      </div>
                      {model.category === 'code_generation' && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                          Code
                        </span>
                      )}
                      {(model as any).isPremium && (
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Premium
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-text-muted mt-0.5 opacity-60 truncate">
                      {model.id}
                    </div>
                  </div>

                  {/* Features */}
                  <div className="hidden sm:flex items-center gap-1.5">
                    {model.supported_features?.includes('vision') && (
                      <div
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-500/5 text-green-500 border border-green-500/10"
                        title="Vision Capable"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {model.supported_features?.includes('thinking') && (
                      <div
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-purple-500/5 text-purple-500 border border-purple-500/10"
                        title="Reasoning/Thinking"
                      >
                        <Brain className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Provider Info */}
                  <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                    {model.providers.map((pId) => {
                      const isConnected = connectedProviders.includes(pId)
                      return (
                        <div
                          key={pId}
                          className={cn(
                            'flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border',
                            isConnected
                              ? 'bg-green-500/10 text-green-500 border-green-500/20'
                              : 'bg-red-500/10 text-red-500 border-red-500/20'
                          )}
                        >
                          {pId.replace('_nim', '')}
                          {isConnected ? (
                            <div className="w-1.5 h-1.5 shadow-glow rounded-full bg-green-500 animate-pulse ml-0.5" />
                          ) : (
                            <Key className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/catalogue/${encodeURIComponent(model.id)}`)
                      }}
                      className="w-10 h-10 rounded-full bg-elevated/80 border border-border-subtle flex items-center justify-center hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all active:scale-95 shrink-0"
                      title="View Details"
                    >
                      <Info className="w-4.5 h-4.5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-primary/5 text-primary/40 border border-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:shadow-glow transition-all shrink-0">
                      <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
