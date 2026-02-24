import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { ConversationSettings } from '@dexterai/registry-types'

interface SettingsDrawerProps {
  open: boolean
  onClose: () => void
  conversationId: string
  settings: ConversationSettings
  onSave: (settings: ConversationSettings) => void
}

const DEFAULTS: ConversationSettings = {
  systemPrompt: 'You are a helpful AI assistant.',
  temperature: 0.7,
  maxTokens: 2048
}

export default function SettingsDrawer({
  open,
  onClose,
  conversationId,
  settings,
  onSave
}: SettingsDrawerProps) {
  const [local, setLocal] = useState<ConversationSettings>({ ...DEFAULTS, ...settings })

  useEffect(() => {
    setLocal({ ...DEFAULTS, ...settings })
  }, [conversationId, open])

  const handleSave = async () => {
    onSave(local)
    await window.dexterai.conversations.update(conversationId, {
      settings_json: JSON.stringify(local)
    })
    onClose()
  }

  if (!open) return null

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-surface border-l border-border shadow-xl z-40 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-text">Chat Settings</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* System Prompt */}
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">
            System Prompt
          </label>
          <textarea
            value={local.systemPrompt || ''}
            onChange={(e) => setLocal({ ...local, systemPrompt: e.target.value })}
            rows={4}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-text resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">
            Temperature: {local.temperature?.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={local.temperature ?? 0.7}
            onChange={(e) => setLocal({ ...local, temperature: parseFloat(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>Precise</span>
            <span>Creative</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <label className="text-xs font-medium text-text-secondary block mb-1.5">
            Max Tokens
          </label>
          <input
            type="number"
            min="1"
            max="128000"
            value={local.maxTokens ?? 2048}
            onChange={(e) => setLocal({ ...local, maxTokens: parseInt(e.target.value) || 2048 })}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-text focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Memory Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">
            Inject memories
          </label>
          <button
            onClick={() => setLocal({ ...local, memoryEnabled: !(local.memoryEnabled !== false) })}
            className={`w-9 h-5 rounded-full transition-colors relative ${local.memoryEnabled !== false ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${local.memoryEnabled !== false ? 'left-[18px]' : 'left-0.5'}`}
            />
          </button>
        </div>
      </div>

      <div className="p-4 border-t border-border shrink-0">
        <button
          onClick={handleSave}
          className="w-full py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}
