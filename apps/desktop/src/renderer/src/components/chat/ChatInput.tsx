import { useState, useRef, useEffect } from 'react'
import { Play, StopCircle } from 'lucide-react'
import ModelSelector from '../ModelSelector'
import type { RegistryModel } from '@dexterai/registry-types'

interface ChatInputProps {
  onSend: (text: string) => void
  onStop: () => void
  isStreaming: boolean
  models: RegistryModel[]
  selectedModelId: string | null
  selectedProviderId: string | null
  connectedProviders: string[]
  onModelChange: (modelId: string, providerId: string) => void
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
  models,
  selectedModelId,
  selectedProviderId,
  connectedProviders,
  onModelChange
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const canSend =
    input.trim().length > 0 &&
    !isStreaming &&
    selectedModelId &&
    selectedProviderId &&
    connectedProviders.includes(selectedProviderId)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (canSend) {
        onSend(input.trim())
        setInput('')
      }
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
  }, [input])

  return (
    <div className="p-4 border-t border-border bg-background shrink-0">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedModelId
              ? 'Message dexterAI... (Enter to send, Shift+Enter for newline)'
              : 'Select a model to start chatting...'
          }
          rows={1}
          className="flex-1 min-h-[44px] max-h-[200px] border border-border rounded-xl px-4 py-3 bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm text-text"
          disabled={isStreaming || !selectedModelId}
        />

        <ModelSelector
          models={models}
          selectedModelId={selectedModelId}
          selectedProviderId={selectedProviderId}
          connectedProviders={connectedProviders}
          onSelect={onModelChange}
        />

        {isStreaming ? (
          <button
            onClick={onStop}
            className="w-11 h-11 flex items-center justify-center shrink-0 border border-red-500/20 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors"
            title="Stop"
          >
            <StopCircle className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            onClick={() => {
              if (canSend) {
                onSend(input.trim())
                setInput('')
              }
            }}
            disabled={!canSend}
            className="w-11 h-11 flex items-center justify-center shrink-0 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-40"
            title="Send"
          >
            <Play className="w-5 h-5 ml-0.5" />
          </button>
        )}
      </div>
    </div>
  )
}
