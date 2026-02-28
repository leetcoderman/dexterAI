import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Info } from 'lucide-react'
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
  maxTokens: 4096
}

export default function SettingsDrawer({
  open,
  onClose,
  conversationId,
  settings,
  onSave
}: SettingsDrawerProps) {
  const [local, setLocal] = useState<ConversationSettings>({ ...DEFAULTS, ...settings })
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const merged = { ...DEFAULTS, ...settings }
    setLocal(merged)
  }, [conversationId, open])

  const handleSave = async () => {
    onSave(local)
    // Merge with existing settings_json to preserve internal flags (e.g. _memoryExtracted)
    try {
      const conv = await window.dexterai.conversations.get(conversationId)
      const existing = conv?.settings_json ? JSON.parse(conv.settings_json) : {}
      const merged = { ...existing, ...local }
      await window.dexterai.conversations.update(conversationId, {
        settings_json: JSON.stringify(merged)
      })
    } catch (e) {
      // Fallback: just save local
      await window.dexterai.conversations.update(conversationId, {
        settings_json: JSON.stringify(local)
      })
    }
    onClose()
  }

  if (!open) return null

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-surface border-l border-border shadow-xl z-40 flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-text">Chat Settings</h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto overflow-x-visible relative">
        {/* Settings Container */}
        <div className="p-4 space-y-6">
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
            <p className="text-[10px] text-gray-400 mt-1">
              Sets the AI's personality and behavior. E.g., "You are a senior React developer."
            </p>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <label className="text-xs font-medium text-text-secondary">
                Temperature: {local.temperature?.toFixed(1)}
              </label>
              <div
                className="relative"
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.right, y: rect.top });
                  setShowTooltip(true);
                }}
                onMouseLeave={() => setShowTooltip(false)}
              >
                <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
              </div>
            </div>
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
              <span>Precise (0)</span>
              <span>Balanced (0.7)</span>
              <span>Creative (2)</span>
            </div>
          </div>



          {/* Memory Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-medium text-text-secondary">
                Inject memories
              </label>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Auto-extracted after 5+ messages
              </p>
            </div>
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

        {/* Temperature Tooltip Portal */}
        {showTooltip && createPortal(
          <div
            className="fixed z-[9999]"
            style={{ top: tooltipPos.y - 8, right: window.innerWidth - tooltipPos.x + 4 }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <div className="-translate-y-full">
              <div className="bg-[#2a2a2e] rounded-xl shadow-2xl border border-white/10 overflow-hidden w-64">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-white font-semibold px-3 py-2">Value</th>
                      <th className="text-left text-white font-semibold px-3 py-2">Behavior</th>
                      <th className="text-left text-white font-semibold px-3 py-2">Best For</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-white/5">
                      <td className="px-3 py-1.5 font-bold" style={{ color: '#4ade80' }}>0.0</td>
                      <td className="px-3 py-1.5 text-gray-300">Deterministic</td>
                      <td className="px-3 py-1.5 text-gray-300">Code, factual Q&A</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-3 py-1.5 font-bold" style={{ color: '#facc15' }}>0.3–0.5</td>
                      <td className="px-3 py-1.5 text-gray-300">Focused</td>
                      <td className="px-3 py-1.5 text-gray-300">Technical writing</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-3 py-1.5 font-bold" style={{ color: '#facc15' }}>0.7</td>
                      <td className="px-3 py-1.5 text-gray-300">Balanced</td>
                      <td className="px-3 py-1.5 text-gray-300">General chat</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="px-3 py-1.5 font-bold" style={{ color: '#d97706' }}>1.0–1.5</td>
                      <td className="px-3 py-1.5 text-gray-300">Creative</td>
                      <td className="px-3 py-1.5 text-gray-300">Brainstorming</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-bold" style={{ color: '#ef4444' }}>2.0</td>
                      <td className="px-3 py-1.5 text-gray-300">Random</td>
                      <td className="px-3 py-1.5 text-gray-300">Experimental only</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {/* Arrow */}
              <div className="absolute right-[11px] -bottom-1.5 w-3 h-3 bg-[#2a2a2e] rotate-45 border-r border-b border-white/10" />
            </div>
          </div>,
          document.body
        )}

        <div className="p-4 border-t border-border shrink-0 z-10 bg-surface">
          <button
            onClick={handleSave}
            className="w-full py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  )
}
