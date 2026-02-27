import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search, Lock, CircleSlash } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import type { RegistryModel } from '@dexterai/registry-types'

interface ModelSelectorProps {
  models: RegistryModel[]
  selectedModelId: string | null
  selectedProviderId: string | null
  connectedProviders: string[]
  connectedModels: string[]
  onSelect: (modelId: string, providerId: string) => void
  agentMode?: boolean
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
  connectedModels,
  onSelect,
  agentMode
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

  const chatModels = models.filter(
    (m) => m.category === 'text_generation' || m.category === 'code_generation' || m.category === 'image_understanding'
  )

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

  const grouped = filtered.reduce<Record<string, RegistryModel[]>>((acc, m) => {
    const key = m.provider_id
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const providerOrder = Object.keys(grouped).sort((a, b) => {
    const aConn = connectedProviders.includes(a) ? 0 : 1
    const bConn = connectedProviders.includes(b) ? 0 : 1
    return aConn - bConn
  })

  const selectedModel = uniqueModels.find(
    (m) => m.id === selectedModelId && m.provider_id === selectedProviderId
  )

  // Build a Set for O(1) lookup of accessible model IDs
  const accessibleModelSet = new Set(connectedModels)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[13px] font-medium transition-all max-w-[140px]",
          open
            ? "border-primary bg-primary/5 text-text"
            : "border-border bg-background/50 text-text-muted hover:text-text hover:border-border-hover shadow-sm"
        )}
      >
        <span className="truncate flex-1">
          {selectedModel ? selectedModel.name : 'Select model'}
        </span>
        <ChevronDown className={cn('w-3 h-3 shrink-0 transition-transform opacity-70', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-[260px] bg-surface border border-border rounded-xl shadow-2xl z-[100] overflow-hidden">
          <div className="p-2 border-b border-border bg-background/30">
            <div className="relative">
              <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search models..."
                className="w-full pl-7 pr-2 py-1 text-[11px] bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary/50"
                autoFocus
              />
            </div>
          </div>

          <div className="max-h-[300px] overflow-y-auto py-1 custom-scrollbar">
            {providerOrder.map((providerId) => {
              const isProviderConnected = connectedProviders.includes(providerId)
              return (
                <div key={providerId} className="mb-1">
                  <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-text-muted/60 flex items-center justify-between">
                    {PROVIDER_LABELS[providerId] || providerId}
                    {isProviderConnected && <div className="w-1 h-1 rounded-full bg-green-500" title="Connected" />}
                  </div>
                  {grouped[providerId].map((model) => {
                    const isSelected = model.id === selectedModelId && model.provider_id === selectedProviderId
                    const hasTools = model.supported_features?.includes('tools')

                    // Model is accessible only if:
                    // 1. Provider is connected
                    // 2. Model ID exists in the API-verified accessible models list
                    // 3. In agent mode, model must support tools
                    const isModelAccessible = isProviderConnected && accessibleModelSet.has(model.id)
                    const isAccessible = isModelAccessible && (!agentMode || hasTools)

                    // Determine the reason for being disabled (for tooltip)
                    const disabledReason = !isProviderConnected
                      ? 'Provider not connected'
                      : !isModelAccessible
                        ? 'Model not available with your API key'
                        : agentMode && !hasTools
                          ? 'No tool support'
                          : ''

                    return (
                      <button
                        key={`${model.provider_id}:${model.id}`}
                        disabled={!isAccessible}
                        title={disabledReason}
                        onClick={() => {
                          onSelect(model.id, model.provider_id)
                          setOpen(false)
                          setSearch('')
                        }}
                        className={cn(
                          'w-full px-3 py-1.5 flex items-center gap-2 text-left text-xs transition-colors',
                          isAccessible
                            ? 'hover:bg-primary/5 text-text cursor-pointer'
                            : 'text-text-muted/30 cursor-not-allowed',
                          isSelected && 'bg-primary/10 text-primary'
                        )}
                      >
                        {isSelected ? (
                          <Check className="w-3 h-3 shrink-0 text-primary" />
                        ) : !isProviderConnected ? (
                          <Lock className="w-3 h-3 shrink-0 opacity-30" />
                        ) : !isModelAccessible ? (
                          <CircleSlash className="w-3 h-3 shrink-0 opacity-30" />
                        ) : (
                          <div className="w-3" />
                        )}
                        <span className={cn("truncate flex-1", !isAccessible && "line-through decoration-text-muted/20")}>
                          {model.name}
                        </span>
                        {agentMode && hasTools && isAccessible && (
                          <span className="text-[8px] text-primary opacity-80">Agent</span>
                        )}
                        {!agentMode && model.supported_features?.includes('vision') && isAccessible && (
                          <span className="text-[8px] opacity-60">Vision</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
