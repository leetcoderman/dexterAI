import { useState } from 'react'
import { useAppStore } from '../store'
import { useNavigate } from 'react-router-dom'
import {
  Bot,
  Key,
  Settings,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertTriangle
} from 'lucide-react'
import { detectProviderFromKey } from '@dexterai/shared-utils'

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Bot },
  { id: 'provider', title: 'Connect Provider', icon: Key },
  { id: 'settings', title: 'Preferences', icon: Settings },
  { id: 'ready', title: 'Ready', icon: CheckCircle2 }
]

export default function Onboarding() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isVerifying, setIsVerifying] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const setOnboarded = useAppStore((state) => state.setOnboarded)
  const addConnectedProvider = useAppStore((state) => state.addConnectedProvider)
  const navigate = useNavigate()

  const handleNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    } else {
      setOnboarded(true)
      // Create first conversation and navigate directly to chat
      window.dexterai.conversations.create().then((conv) => {
        if (conv) {
          navigate(`/chat/${conv.id}`)
        } else {
          navigate('/')
        }
      })
    }
  }

  const handleConnectOpenAI = async () => {
    if (!apiKey.trim()) return
    setIsVerifying(true)
    setErrorMsg('')
    try {
      await window.dexterai.credentials.save('openai', apiKey)
      const result = await window.dexterai.provider.verify('openai', 'gpt-4o-mini')
      if (result?.success) {
        addConnectedProvider('openai')
        handleNext()
      } else {
        setErrorMsg(result?.error?.message || 'Failed to verify key. Check and try again.')
        await window.dexterai.credentials.delete('openai')
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error saving credentials.')
    } finally {
      setIsVerifying(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStepIndex) {
      case 0:
        return (
          <div className="flex flex-col items-center space-y-4 text-center mt-4 w-full">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Welcome to dexterAI</h2>
            <p className="text-gray-500 max-w-xs">
              The premier platform for comparing and testing AI models side-by-side. Let's get your
              workspace set up.
            </p>
            <button
              onClick={handleNext}
              className="mt-6 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center w-full justify-center"
            >
              Get Started <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )

      case 1:
        return (
          <div className="flex flex-col items-center space-y-4 w-full mt-4">
            <h2 className="text-xl font-bold">Connect your first provider</h2>
            <p className="text-sm text-gray-500 text-center mb-2">
              Your API keys are stored securely in your local OS Keychain — never in the cloud.
            </p>

            <div className="w-full space-y-3">
              <label className="text-sm font-medium">OpenAI API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConnectOpenAI()}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none text-text"
              />
              {detectProviderFromKey(apiKey) === 'nvidia_nim' && (
                <div className="text-sm text-yellow-600 dark:text-yellow-500 font-medium bg-yellow-50 dark:bg-yellow-500/10 p-2 rounded flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    This looks like an NVIDIA NIM key (nvapi-). To use NVIDIA NIM, skip this step
                    and connect via the NVIDIA NIM connector in the app.
                  </span>
                </div>
              )}
              {errorMsg && <p className="text-sm text-red-500 font-medium">{errorMsg}</p>}
            </div>

            <div className="flex space-x-3 w-full mt-4">
              <button
                onClick={handleNext}
                className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-black/5 dark:hover:bg-white/5 flex-1 transition-colors"
              >
                Skip for now
              </button>
              <button
                onClick={handleConnectOpenAI}
                disabled={
                  isVerifying || !apiKey.trim() || detectProviderFromKey(apiKey) === 'nvidia_nim'
                }
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex-1 disabled:opacity-50 flex items-center justify-center transition-colors"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {isVerifying ? 'Connecting...' : 'Connect OpenAI'}
              </button>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="flex flex-col items-center space-y-4 text-center mt-4 w-full">
            <h2 className="text-xl font-bold">Preferences</h2>
            <p className="text-sm text-gray-500 text-center mb-2">
              Configure your defaults. You can change these later in Settings.
            </p>

            <div className="w-full bg-background border border-border rounded-xl p-4 flex items-center justify-between">
              <div className="text-left">
                <p className="font-medium text-sm">Appearance</p>
                <p className="text-xs text-gray-500">Theme follows your system preferences.</p>
              </div>
              <span className="text-xs text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
                System Default
              </span>
            </div>

            <button
              onClick={handleNext}
              className="mt-6 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors flex items-center w-full justify-center"
            >
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        )

      case 3:
      default:
        return (
          <div className="flex flex-col items-center space-y-4 text-center mt-4 w-full">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2 text-green-500">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold">You're all set!</h2>
            <p className="text-gray-500">
              Your workspace is ready. Start discovering and testing AI models.
            </p>
            <button
              onClick={handleNext}
              className="mt-6 px-6 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors w-full"
            >
              Enter Workspace
            </button>
          </div>
        )
    }
  }

  return (
    <div className="flex flex-col h-screen w-full items-center justify-center bg-background text-text">
      <div className="max-w-md w-full p-8 border border-border rounded-2xl bg-surface shadow-lg flex flex-col items-center">
        {/* Stepper */}
        <div className="flex items-center w-full justify-between mb-8 relative px-4">
          <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-border -z-10" />
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIndex
            const isCurrent = idx === currentStepIndex
            return (
              <div key={step.id} className="flex flex-col items-center bg-surface">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors
                                    ${isCompleted ? 'bg-primary text-white' : isCurrent ? 'bg-primary text-white border-4 border-background outline outline-2 outline-primary' : 'bg-surface border-2 border-border text-gray-400'}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
              </div>
            )
          })}
        </div>

        {renderStepContent()}
      </div>
    </div>
  )
}
