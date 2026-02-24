import { useNavigate } from 'react-router-dom'
import { MessageSquare, Code2, Image, Mic, Volume2, ArrowRight } from 'lucide-react'

const CATEGORIES = [
  {
    id: 'text_generation',
    label: 'Text Generation',
    description: 'Chat, reasoning, summarisation, and standard text completions.',
    icon: MessageSquare,
    gradient: 'from-blue-500/20 to-blue-600/5',
    iconColor: 'text-blue-400'
  },
  {
    id: 'code_generation',
    label: 'Code Generation',
    description: 'Code completion, refactoring, debugging, and logic generation.',
    icon: Code2,
    gradient: 'from-violet-500/20 to-violet-600/5',
    iconColor: 'text-violet-400'
  },
  {
    id: 'image_generation',
    label: 'Image Generation',
    description: 'Generate high-quality images from text prompts.',
    icon: Image,
    gradient: 'from-pink-500/20 to-pink-600/5',
    iconColor: 'text-pink-400'
  },
  {
    id: 'audio_transcription',
    label: 'Audio Transcription',
    description: 'Transcribe or translate audio files with word-level timestamps.',
    icon: Mic,
    gradient: 'from-amber-500/20 to-amber-600/5',
    iconColor: 'text-amber-400'
  },
  {
    id: 'text_to_speech',
    label: 'Text to Speech',
    description: 'Convert text into natural, human-like speech with multiple voice options.',
    icon: Volume2,
    gradient: 'from-teal-500/20 to-teal-600/5',
    iconColor: 'text-teal-400'
  }
]

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-4xl mx-auto animate-fade-in">
        <div className="mb-10">
          <h1 className="text-2xl font-bold tracking-tight mb-2">Use-case Gallery</h1>
          <p className="text-sm text-text-muted">
            Select a workspace category to start testing AI models.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {CATEGORIES.map(({ id, label, description, icon: Icon, gradient, iconColor }) => (
            <button
              key={id}
              onClick={() => navigate(`/catalogue?category=${id}`)}
              className="group relative p-5 rounded-xl bg-surface border border-border-subtle hover:border-primary/40 hover:shadow-glow cursor-pointer transition-all duration-200 text-left overflow-hidden"
            >
              {/* Gradient backdrop */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative">
                <div className={`w-10 h-10 rounded-lg bg-elevated flex items-center justify-center mb-3 ${iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-[15px] mb-1.5 text-text group-hover:text-white transition-colors">
                  {label}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed mb-3">{description}</p>
                <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Browse models <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
