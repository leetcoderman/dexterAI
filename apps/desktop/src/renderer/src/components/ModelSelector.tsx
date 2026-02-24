import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Lock } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import type { RegistryModel } from '@dexterai/registry-types'

interface ModelSelectorProps {
  models: RegistryModel[]
  selectedModelId: string | null
  selectedProviderId: string | null
  connectedProviders: string[]
  onSelect: (modelId: string, providerId: string) => void
}

const PROVIDER_LABELS: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  google: 'Google',
  nvidia_nim: 'NVIDIA NIM'
}

export default function ModelSelector({
  models,
  selectedModelId,
  selectedProviderId,
  connectedProviders,
  onSelect
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filter to text/code models only
  const chatModels = models.filter(
    (m) => m.category === 'text_generation' || m.category === 'code_generation'
  )

  // Deduplicate by model id (some appear in both categories)
  const uniqueModels = chatModels.reduce<RegistryModel[]>((acc, m) => {
    if (!acc.find((x) => x.id === m.id && x.provider_id === m.provider_id)) acc.push(m)
    return acc
  }, [])

  const filtered = search
    ? uniqueModels.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.id.toLowerCase().includes(search.toLowerCase())
      )
    : uniqueModels

  // Group by provider
  const grouped = filtered.reduce<Record<string, RegistryModel[]>>((acc, m) => {
    const key = m.provider_id
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  // Sort providers: connected first
  const providerOrder = Object.keys(grouped).sort((a, b) => {
    const aConn = connectedProviders.includes(a) ? 0 : 1
    const bConn = connectedProviders.includes(b) ? 0 : 1
    return aConn - bConn
  })

  const selectedModel = uniqueModels.find(
    (m) => m.id === selectedModelId && m.provider_id === selectedProviderId
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors min-w-[160px]',
          open
            ? 'border-primary bg-primary/5 text-text'
            : 'border-border bg-surface text-text hover:border-gray-400'
        )}
      >
        <span className="truncate flex-1 text-left">
          {selectedModel ? selectedModel.name : 'Select model'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 right-0 w-[280px] bg-surface border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[320px] overflow-y-auto py-1">
            {providerOrder.map((providerId) => {
              const isConnected = connectedProviders.includes(providerId)
              return (
                <div key={providerId}>
                  <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center justify-between">
                    {PROVIDER_LABELS[providerId] || providerId}
                    {isConnected && (
                      <span className="text-green-500 text-[9px] font-medium normal-case">Connected</span>
                    )}
                  </div>
                  {grouped[providerId].map((model) => {
                    const isSelected = model.id === selectedModelId && model.provider_id === selectedProviderId
                    return (
                      <button
                        key={`${model.provider_id}:${model.id}`}
                        disabled={!isConnected}
                        onClick={() => {
                          onSelect(model.id, model.provider_id)
                          setOpen(false)
                          setSearch('')
                        }}
                        className={cn(
                          'w-full px-3 py-2 flex items-center gap-2 text-left text-sm transition-colors',
                          isConnected
                            ? 'hover:bg-black/5 dark:hover:bg-white/5 text-text cursor-pointer'
                            : 'text-gray-400 cursor-not-allowed opacity-50',
                          isSelected && 'bg-primary/5'
                        )}
                      >
                        {isConnected ? (
                          <Check
                            className={cn(
                              'w-3.5 h-3.5 shrink-0',
                              isSelected ? 'text-primary' : 'text-transparent'
                            )}
                          />
                        ) : (
                          <Lock className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                        )}
                        <span className="truncate">{model.name}</span>
                        {model.category === 'code_generation' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-medium shrink-0">
                            Code
                          </span>
                        )}
                        {model.supported_features?.includes('vision') && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500 font-medium shrink-0">
                            Vision
                          </span>
                        )}
                        {model.supported_features?.includes('thinking') && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 font-medium shrink-0">
                            Reasoning
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {providerOrder.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">No models found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
