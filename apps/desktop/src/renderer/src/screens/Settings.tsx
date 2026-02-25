import { useState } from 'react'
import { Trash2, AlertTriangle, MessageSquare, Key, Bomb, Monitor } from 'lucide-react'
import { useAppStore } from '../store'

type DeleteMode = 'chat' | 'keys_analytics' | 'everything'

const DELETE_OPTIONS: {
  mode: DeleteMode
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}[] = [
    {
      mode: 'chat',
      label: 'Delete All Chat History',
      description: 'Removes all conversations, messages, and memories. API keys and test run analytics are kept.',
      icon: MessageSquare,
      color: 'text-yellow-500'
    },
    {
      mode: 'keys_analytics',
      label: 'Delete All API Keys & Analytics',
      description:
        'Removes all stored API keys from the OS keychain, provider connections, test run history, and saved templates. Chat history is kept.',
      icon: Key,
      color: 'text-orange-500'
    },
    {
      mode: 'everything',
      label: 'Delete Everything',
      description:
        'Removes all data: chat history, memories, API keys, connections, test runs, and templates. This is a full reset.',
      icon: Bomb,
      color: 'text-red-500'
    }
  ]

export default function Settings() {
  const [confirming, setConfirming] = useState<DeleteMode | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { syncConnectedProviders, loadConversations, zoomLevel, setZoomLevel } = useAppStore()

  const handleDelete = async (mode: DeleteMode) => {
    setDeleting(true)
    try {
      const result = await window.dexterai.settings.deleteData(mode)
      if (result.success) {
        if (mode === 'keys_analytics' || mode === 'everything') {
          await syncConnectedProviders()
        }
        if (mode === 'chat' || mode === 'everything') {
          await loadConversations()
        }
      }
    } catch (e) {
      console.error('Delete failed:', e)
    } finally {
      setDeleting(false)
      setConfirming(null)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-background shrink-0">
        <h2 className="text-sm font-semibold text-text">Settings</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl space-y-8">
          {/* Appearance Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Appearance
            </h3>
            <div className="border border-border rounded-xl p-4 bg-surface">
              <div className="flex items-start gap-4">
                <Monitor className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text">Global Zoom Level</p>
                  <p className="text-xs text-gray-400 mt-1">Scale the entire interface cleanly by adjusting the root layout. (Cmd/Ctrl + / - to adapt)</p>
                </div>
                <select
                  value={zoomLevel.toString()}
                  onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                  className="bg-background border border-border text-text text-sm rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block p-2 cursor-pointer outline-none transition-shadow"
                >
                  <option value="50">50%</option>
                  <option value="67">67%</option>
                  <option value="75">75%</option>
                  <option value="80">80%</option>
                  <option value="90">90%</option>
                  <option value="100">100% (Default)</option>
                  <option value="110">110%</option>
                  <option value="125">125%</option>
                  <option value="150">150%</option>
                  <option value="175">175%</option>
                  <option value="200">200%</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Danger Zone
            </h3>

            {DELETE_OPTIONS.map(({ mode, label, description, icon: Icon, color }) => (
              <div
                key={mode}
                className="border border-border rounded-xl p-4 bg-surface"
              >
                <div className="flex items-start gap-3">
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>
                  {confirming === mode ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(mode)}
                        disabled={deleting}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {deleting ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirming(null)}
                        disabled={deleting}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-elevated transition-colors text-text-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirming(mode)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-500 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
