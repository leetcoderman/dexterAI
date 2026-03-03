import { useNavigate } from 'react-router-dom'
import { MessageSquare, Code2, Image as ImageIcon, Video, ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'

const USE_CASES = [
  {
    id: 'text_generation',
    title: 'Text Generation',
    description: 'Models optimized for analysis, creative writing, and chat.',
    icon: MessageSquare,
    color: 'emerald'
  },
  {
    id: 'code_generation',
    title: 'Code Generation',
    description: 'Specialized models for programming, refactoring, and debugging.',
    icon: Code2,
    color: 'blue'
  },
  {
    id: 'image_generation',
    title: 'Image Generation',
    description: 'Create, edit, and manipulate visual content using AI.',
    icon: ImageIcon,
    color: 'orange'
  },
  {
    id: 'video_generation',
    title: 'Video Generation',
    description: 'Transform concepts into dynamic video motion.',
    icon: Video,
    color: 'purple'
  }
]

export default function UseCaseGalleryScreen() {
  const navigate = useNavigate()

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="max-w-5xl mx-auto animate-fade-in pt-10">
        <header className="mb-12 text-center flex flex-col items-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 mb-6 border border-primary/20">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-4">Choose Your Objective</h1>
          <p className="text-lg text-text-muted max-w-2xl">
            Select a use-case below to be routed to our targeted model catalogue tailored
            specifically to your needs.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {USE_CASES.map((uc) => {
            const isEmerald = uc.color === 'emerald'
            const isBlue = uc.color === 'blue'
            const isOrange = uc.color === 'orange'
            const isPurple = uc.color === 'purple'

            return (
              <button
                key={uc.id}
                onClick={() => navigate(`/catalogue?category=${uc.id}`)}
                className={cn(
                  'relative group text-left overflow-hidden rounded-[32px] p-8 border border-border-subtle bg-surface hover:-translate-y-1 transition-all duration-300',
                  'hover:shadow-2xl',
                  isEmerald && 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
                  isBlue && 'hover:border-blue-500/50 hover:shadow-blue-500/10',
                  isOrange && 'hover:border-orange-500/50 hover:shadow-orange-500/10',
                  isPurple && 'hover:border-purple-500/50 hover:shadow-purple-500/10'
                )}
              >
                {/* Background glow on hover */}
                <div
                  className={cn(
                    'absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-0 group-hover:opacity-20 transition-opacity rounded-full',
                    isEmerald && 'bg-emerald-500',
                    isBlue && 'bg-blue-500',
                    isOrange && 'bg-orange-500',
                    isPurple && 'bg-purple-500'
                  )}
                />

                <div className="relative z-10 flex flex-col h-full">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border',
                      isEmerald && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                      isBlue && 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                      isOrange && 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                      isPurple && 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                    )}
                  >
                    <uc.icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {uc.title}
                  </h3>
                  <p className="text-text-muted leading-relaxed font-medium mb-8 flex-1">
                    {uc.description}
                  </p>

                  <div className="flex items-center gap-2 text-sm font-bold opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-text">
                    Browse models
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
