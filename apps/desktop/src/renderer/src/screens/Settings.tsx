import { useState } from 'react'
import {
  MessageSquare,
  Key,
  Bomb,
  Monitor,
  Gift,
  ArrowRight,
  Sparkles,
  Thermometer,
  Zap,
  Cpu,
  ShieldCheck,
  Info
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../store'
import { cn } from '@dexterai/shared-utils'

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
      description: 'Removes all conversations, messages, and memories. API keys are kept.',
      icon: MessageSquare,
      color: 'text-yellow-500'
    },
    {
      mode: 'keys_analytics',
      label: 'Delete All API Keys & Analytics',
      description: 'Removes all stored API keys from the OS keychain and connection history.',
      icon: Key,
      color: 'text-orange-500'
    },
    {
      mode: 'everything',
      label: 'Delete Everything',
      description: 'Removes all data: chat history, memories, and API keys. This is a full reset.',
      icon: Bomb,
      color: 'text-red-500'
    }
  ]

export default function Settings() {
  const [confirming, setConfirming] = useState<DeleteMode | null>(null)
  const [deleting, setDeleting] = useState(false)
  const {
    syncConnectedProviders,
    loadConversations,
    zoomLevel,
    setZoomLevel,
    defaultSystemPrompt,
    setDefaultSystemPrompt,
    defaultTemperature,
    setDefaultTemperature,
    showExperimentalFeatures,
    setShowExperimentalFeatures,
    allModels,
    connectedProviders,
    preferredModelId,
    preferredProviderId,
    setPreferredModel
  } = useAppStore()

  const availableModels = allModels.filter((m) => connectedProviders.includes(m.provider_id))

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
    <div className="flex flex-col h-full bg-background">
      <div className="px-8 py-4 border-b border-border bg-background shrink-0">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-bold text-text">Settings</h2>
          <p className="text-xs text-text-muted">Configure your AI workspace and data preferences.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-3xl mx-auto space-y-12 pb-24">

          {/* AI Preferences */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">AI Preferences</h3>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Default System Prompt */}
              <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <p className="text-sm font-bold text-text">Global Default System Prompt</p>
                  </div>
                </div>
                <textarea
                  value={defaultSystemPrompt}
                  onChange={(e) => setDefaultSystemPrompt(e.target.value)}
                  className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-text focus:outline-none focus:ring-1 focus:ring-primary transition-all resize-none"
                  rows={4}
                  placeholder="e.g. You are a senior software engineer..."
                />
                <p className="text-[10px] text-text-muted italic">
                  This prompt will be used as the base for all new conversations unless overridden.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Temperature */}
                <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-orange-400" />
                      <p className="text-sm font-bold text-text">Default Temperature</p>
                    </div>
                    <span className="text-xs font-mono font-bold text-primary">{defaultTemperature.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={defaultTemperature}
                    onChange={(e) => setDefaultTemperature(parseFloat(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-[10px] text-text-muted font-bold">
                    <span>Precise</span>
                    <span>Balanced</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Preferred Model */}
                <div className="p-6 rounded-2xl bg-surface border border-border-subtle space-y-4">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <p className="text-sm font-bold text-text">Preferred Default Model</p>
                  </div>
                  <select
                    value={`${preferredModelId ?? ''}|${preferredProviderId ?? ''}`}
                    onChange={(e) => {
                      const [mId, pId] = e.target.value.split('|')
                      setPreferredModel(mId || null, pId || null)
                    }}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="|">Let dexterAI Decide</option>
                    {availableModels.map((m) => (
                      <option key={`${m.id}-${m.provider_id}`} value={`${m.id}|${m.provider_id}`}>
                        {m.name} ({m.provider_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>

          {/* Appearance Section */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Monitor className="w-5 h-5 text-indigo-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Appearance</h3>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border-subtle flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-bold text-text">Global Zoom Level</p>
                <p className="text-xs text-text-muted">Scale the entire interface cleanly for your display.</p>
              </div>
              <select
                value={zoomLevel.toString()}
                onChange={(e) => setZoomLevel(parseInt(e.target.value))}
                className="bg-background border border-border text-text text-sm rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary outline-none transition-shadow cursor-pointer font-bold"
              >
                <option value="50">50%</option>
                <option value="75">75%</option>
                <option value="90">90%</option>
                <option value="100">100%</option>
                <option value="110">110%</option>
                <option value="125">125%</option>
                <option value="150">150%</option>
              </select>
            </div>
          </section>

          {/* Experimental Features */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Experimental Features</h3>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border-subtle flex items-baseline justify-between gap-6">
              <div className="space-y-1 flex-1">
                <p className="text-sm font-bold text-text">Enable Experimental Tools</p>
                <p className="text-xs text-text-muted">
                  Activates <span className="text-primary font-bold italic">Code Workspace</span> and <span className="text-primary font-bold italic">Memory Systems</span>.
                  These features are currently in beta and may be unstable.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={showExperimentalFeatures}
                  onChange={(e) => setShowExperimentalFeatures(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </section>

          {/* Help & Resources */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-emerald-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-text-muted">Help & Resources</h3>
            </div>

            <Link
              to="/free-keys"
              className="group p-6 rounded-2xl bg-surface border border-border-subtle hover:border-emerald-500/50 transition-all flex items-center gap-6"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-text group-hover:text-emerald-500 transition-colors">Free API Keys Guide</p>
                <p className="text-xs text-text-muted mt-1">
                  Learn how to get free API access from Google, NVIDIA, GitHub, and OpenRouter.
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-text-muted group-hover:translate-x-1 transition-transform" />
            </Link>
          </section>

          {/* Danger Zone */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Bomb className="w-5 h-5 text-red-500" />
              <h3 className="text-xs font-black uppercase tracking-widest text-red-500/60">Danger Zone</h3>
            </div>

            <div className="space-y-3">
              {DELETE_OPTIONS.map(({ mode, label, description, icon: Icon, color }) => (
                <div key={mode} className="border border-border-subtle rounded-2xl p-5 bg-surface transition-colors hover:border-red-500/20">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-10 h-10 rounded-xl bg-red-500/5 flex items-center justify-center", color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-text">{label}</p>
                      <p className="text-[11px] text-text-muted mt-0.5">{description}</p>
                    </div>
                    {confirming === mode ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDelete(mode)}
                          disabled={deleting}
                          className="px-4 py-2 text-xs font-bold bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20"
                        >
                          {deleting ? 'Deleting...' : 'Confirm Delete'}
                        </button>
                        <button
                          onClick={() => setConfirming(null)}
                          disabled={deleting}
                          className="px-4 py-2 text-xs font-bold border border-border rounded-xl hover:bg-elevated transition-colors text-text-muted"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirming(mode)}
                        className="px-4 py-2 text-xs font-bold border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* About Section */}
          <section className="pt-12 border-t border-border-subtle">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="flex items-center gap-2 text-text font-black text-xl tracking-tighter">
                <ShieldCheck className="w-6 h-6 text-emerald-500" />
                dexterAI
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-text-muted">Version 3.2.0 (Stable)</p>
                <p className="text-[10px] text-text-muted/60 uppercase tracking-widest font-black">Built for Sovereignty</p>
              </div>
              <div className="flex items-center gap-4 pt-4">
                <Info className="w-3.5 h-3.5 text-text-muted" />
                <p className="text-[10px] text-text-muted leading-relaxed max-w-sm">
                  This application stores all your data locally on your device.
                  Your API keys are encrypted using the OS Keychain.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
