import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react'
import { useAppStore } from '../store'
import { cn } from '@dexterai/shared-utils'

// Import logos
import openaiLogo from '../assets/logos/openai.jpeg'
import anthropicLogo from '../assets/logos/anthropic.png'
import deepgramLogo from '../assets/logos/deepgram.png'
import googleLogo from '../assets/logos/google.webp'
import nvidiaLogo from '../assets/logos/Nvidia_logo.svg.png'
import githubLogo from '../assets/logos/github.png'

const PROVIDER_DATA = [
  { id: 'openai', label: 'OpenAI', logo: openaiLogo, description: 'GPT-4o, GPT-4, GPT-3.5 Turbo' },
  { id: 'anthropic', label: 'Anthropic', logo: anthropicLogo, description: 'Claude 3.5 Sonnet, Opus, Haiku' },
  { id: 'google', label: 'Google Gemini', logo: googleLogo, description: 'Gemini 1.5 Pro, Flash' },
  { id: 'nvidia_nim', label: 'NVIDIA NIM', logo: nvidiaLogo, description: 'Llama 3, Mixtral, Gemma via NVIDIA' },
  { id: 'deepgram', label: 'Deepgram', logo: deepgramLogo, description: 'Speech-to-Text & Text-to-Speech' },
  { id: 'github', label: 'GitHub Models', logo: githubLogo, description: 'GPT-4.1, GPT-5, o3, DeepSeek, Llama 4, Grok 3 via GitHub' }
]

export default function ProvidersScreen() {
  const navigate = useNavigate()
  const { connectedProviders } = useAppStore()

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-6 py-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-xl font-bold text-text tracking-tight">AI Providers</h2>
        <p className="text-sm text-text-muted mt-1">Manage your connections and API keys</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {PROVIDER_DATA.map((provider) => {
            const isConnected = connectedProviders.includes(provider.id)

            return (
              <button
                key={provider.id}
                onClick={() => navigate(`/provider/${provider.id}`)}
                className={cn(
                  "group relative flex flex-col items-center text-center p-8 rounded-2xl transition-all duration-300 border-2",
                  isConnected
                    ? "bg-surface border-primary/20 hover:border-primary/40 shadow-lg shadow-primary/5"
                    : "bg-surface/50 border-border hover:border-border-strong hover:bg-surface shadow-sm"
                )}
              >
                {/* Status Indicator */}
                <div className="absolute top-4 right-4">
                  {isConnected ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      Connected
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/10 text-gray-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      <XCircle className="w-3 h-3" />
                      Not Connected
                    </div>
                  )}
                </div>

                {/* Logo Container */}
                <div className="w-20 h-20 mb-6 rounded-2xl bg-white shadow-md flex items-center justify-center p-4 group-hover:scale-110 transition-transform duration-300">
                  <img
                    src={provider.logo}
                    alt={provider.label}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-text mb-2">{provider.label}</h3>
                <p className="text-xs text-text-muted leading-relaxed px-4">
                  {provider.description}
                </p>

                {/* Action CTA */}
                <div className="mt-8 flex items-center gap-2 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                  {isConnected ? 'Edit Connection' : 'Set up Provider'}
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
