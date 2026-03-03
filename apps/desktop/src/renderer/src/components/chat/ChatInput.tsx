import { useState, useRef, useEffect } from 'react'
import { ArrowRight, StopCircle, Plus, Copy, Check } from 'lucide-react'
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
  connectedModels: string[]
  modelsByProvider: Record<string, string[]>
  onModelChange: (modelId: string, providerId: string) => void
  agentMode?: boolean
}

export default function ChatInput({
  onSend,
  onStop,
  isStreaming,
  models,
  selectedModelId,
  selectedProviderId,
  connectedProviders,
  connectedModels,
  modelsByProvider,
  onModelChange,
  agentMode
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)
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

  const handleCopy = () => {
    if (!input) return
    navigator.clipboard.writeText(input)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
    <div className="p-4 bg-background shrink-0">
      <div className="flex flex-col bg-surface border border-border rounded-[1.25rem] p-3 focus-within:ring-1 focus-within:ring-primary/50 transition-shadow shadow-sm">
        {/* Top: Text Area */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedModelId
              ? 'Ask anything, @ to mention, / for workflows...'
              : 'Select a model to start chatting...'
          }
          rows={1}
          className="w-full min-h-[44px] max-h-[200px] bg-transparent resize-none focus:outline-none text-sm text-text placeholder:text-text-muted/70 px-1"
          disabled={isStreaming || !selectedModelId}
        />

        {/* Bottom: Tools and Actions */}
        <div className="flex items-center justify-between mt-2">
          {/* Left tools: Attachment & Model Selector & Copy Button */}
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 text-text-muted hover:text-text hover:bg-background/50 rounded-full transition-colors group relative cursor-not-allowed"
              title="Coming soon - files & images"
              disabled
            >
              <Plus className="w-5 h-5" />
            </button>

            <button
              onClick={handleCopy}
              disabled={!input || isStreaming}
              className="p-1.5 text-text-muted hover:text-text hover:bg-background/50 rounded-full transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
              title="Copy input"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>

            <div className="flex items-center">
              <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                selectedProviderId={selectedProviderId}
                connectedProviders={connectedProviders}
                connectedModels={connectedModels}
                modelsByProvider={modelsByProvider}
                onSelect={onModelChange}
                agentMode={agentMode}
              />
            </div>
          </div>

          {/* Right tool: Send/Stop Button */}
          {isStreaming ? (
            <button
              onClick={onStop}
              className="w-8 h-8 flex items-center justify-center shrink-0 bg-text text-background rounded-full hover:opacity-80 transition-opacity"
              title="Stop"
            >
              <StopCircle className="w-4 h-4 fill-current" />
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
              className="w-8 h-8 flex items-center justify-center shrink-0 bg-text text-background rounded-full hover:opacity-80 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
              title="Send"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
