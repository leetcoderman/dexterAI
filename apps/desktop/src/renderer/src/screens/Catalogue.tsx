import { useState, useEffect, useMemo } from 'react'
import { Search, Key, ChevronRight, Sparkles } from 'lucide-react'
import { useAppStore } from '../store'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { RegistryModel } from '@dexterai/registry-types'

const CATEGORY_LABELS: Record<string, string> = {
  text_generation: 'Text',
  code_generation: 'Code',
  image_generation: 'Image',
  audio_transcription: 'Audio',
  text_to_speech: 'TTS'
}

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'bg-emerald-500/10 text-emerald-400',
  anthropic: 'bg-orange-500/10 text-orange-400',
  google: 'bg-blue-500/10 text-blue-400',
  deepgram: 'bg-indigo-500/10 text-indigo-400'
}

export default function Catalogue() {
  const [models, setModels] = useState<RegistryModel[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchParams] = useSearchParams()
  const categoryFilter = searchParams.get('category') ?? ''

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
    let list = models
    if (categoryFilter) list = list.filter((m) => m.category === categoryFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider_id.toLowerCase().includes(q)
      )
    }
    return list
  }, [models, categoryFilter, searchQuery])

  const handleModelClick = (model: RegistryModel) => {
    navigate(`/test/${encodeURIComponent(model.id)}`, { state: { providerId: model.provider_id } })
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1">Model Catalogue</h1>
            <p className="text-sm text-text-muted">
              {categoryFilter
                ? `Showing ${CATEGORY_LABELS[categoryFilter] ?? categoryFilter} models`
                : 'Browse all available AI models across providers.'}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-elevated border border-border-subtle rounded-lg px-3 py-2 shrink-0 focus-within:border-primary/50 transition-colors">
            <Search className="w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-48 text-text placeholder:text-text-muted"
            />
          </div>
        </div>

        {/* Model cards */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted text-sm">
            Loading models...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted">
            <Sparkles className="w-8 h-8 mb-3 opacity-30" />
            <p className="text-sm">No models found.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((model) => {
              const ready = connectedProviders.includes(model.provider_id)
              return (
                <button
                  key={`${model.id}-${model.category}`}
                  onClick={() => handleModelClick(model)}
                  className="w-full flex items-center gap-4 px-4 py-3 rounded-xl bg-surface border border-border-subtle hover:border-primary/30 hover:bg-elevated transition-all duration-150 group text-left"
                >
                  {/* Model name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text truncate">{model.name}</div>
                    <div className="text-xs text-text-muted mt-0.5">{model.id}</div>
                  </div>

                  {/* Provider chip */}
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize ${PROVIDER_COLORS[model.provider_id] ?? 'bg-elevated text-text-muted'}`}
                  >
                    {model.provider_id}
                  </span>

                  {/* Category badge */}
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-elevated text-text-secondary">
                    {CATEGORY_LABELS[model.category] ?? model.category}
                  </span>

                  {/* Status */}
                  <div className="w-20 text-right">
                    {ready ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-text-muted">
                        <Key className="w-3 h-3" />
                        Need key
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
