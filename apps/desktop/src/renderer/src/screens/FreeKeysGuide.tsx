import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Key, Zap, Gift, Sparkles, ExternalLink, Globe, Github } from 'lucide-react'

const GUIDES = [
    {
        provider: 'Google AI Studio',
        title: 'Get free Gemini API keys',
        description: 'Google offers a generous free tier for Gemini 1.5 Pro and Flash models through AI Studio.',
        steps: [
            'Visit Google AI Studio (aistudio.google.com).',
            'Sign in with your Google Account.',
            'Click on "Get API key" in the sidebar.',
            'Create a new API key in a new project.'
        ],
        link: 'https://aistudio.google.com/',
        youtube: 'https://www.youtube.com/results?search_query=how+to+get+google+gemini+api+key',
        icon: Sparkles,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10'
    },
    {
        provider: 'NVIDIA NIM',
        title: 'Free credits for Llama, Mistral & more',
        description: 'NVIDIA provides free 1,000 credits to developers for testing high-performance NIM microservices.',
        steps: [
            'Go to NVIDIA build (build.nvidia.com).',
            'Sign up or sign in to your NVIDIA developer account.',
            'Select any model (e.g., Llama 3.1 405B).',
            'Generate your API key from the model page.'
        ],
        link: 'https://build.nvidia.com/',
        youtube: 'https://www.youtube.com/results?search_query=nvidia+nim+api+key+tutorial',
        icon: Zap,
        color: 'text-[#76b900]',
        bg: 'bg-[#76b900]/10'
    },
    {
        provider: 'GitHub Models',
        title: 'Access top models for free',
        description: 'GitHub Models (Marketplace) allows developers to test Llama, Phi, and Mistral models via their API.',
        steps: [
            'Navigate to GitHub Marketplace -> Models.',
            'Join the Waitlist (usually approved quickly).',
            'Select a model and click "Get started".',
            'Use your GitHub Personal Access Token as the API key.'
        ],
        link: 'https://github.com/marketplace/models',
        youtube: 'https://www.youtube.com/results?search_query=github+models+marketplace+tutorial',
        icon: Github,
        color: 'text-white',
        bg: 'bg-white/10'
    },
    {
        provider: 'OpenRouter',
        title: 'Discover myriad free models',
        description: 'OpenRouter aggregates many providers and lists several models with $0 cost for testing.',
        steps: [
            'Visit OpenRouter.ai.',
            'Navigate to the Models section.',
            'Filter models by "Free" or sort by price (lowest first).',
            'Generate a key and connect it to dexterAI.'
        ],
        link: 'https://openrouter.ai/models?max_price=0',
        youtube: 'https://www.youtube.com/results?search_query=openrouter+ai+api+key+setup',
        icon: Globe,
        color: 'text-indigo-500',
        bg: 'bg-indigo-500/10'
    }
]

export default function FreeKeysGuide() {
    const navigate = useNavigate()

    return (
        <div className="h-full overflow-y-auto bg-background p-8">
            <div className="max-w-4xl mx-auto space-y-12 pb-24 animate-fade-in">
                {/* Header */}
                <div className="space-y-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors group mb-8"
                    >
                        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        Go back
                    </button>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Gift className="w-6 h-6" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-text">Free API Keys Guide</h1>
                    </div>
                    <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
                        Building and testing AI should be accessible to everyone. Here is how you can get started for free with the most popular providers.
                    </p>
                </div>

                {/* Guide Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {GUIDES.map((guide, i) => (
                        <div key={i} className="flex flex-col p-8 rounded-3xl bg-surface border border-border-subtle group hover:border-primary/30 transition-all shadow-sm">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`w-12 h-12 rounded-2xl ${guide.bg} flex items-center justify-center ${guide.color}`}>
                                    <guide.icon className="w-6 h-6" />
                                </div>
                                <a
                                    href={guide.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-primary transition-colors"
                                >
                                    <ExternalLink className="w-5 h-5" />
                                </a>
                            </div>

                            <div className="space-y-2 mb-6">
                                <div className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                                    {guide.provider}
                                </div>
                                <h3 className="text-xl font-bold text-text group-hover:text-primary transition-colors">
                                    {guide.title}
                                </h3>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    {guide.description}
                                </p>
                            </div>

                            <div className="flex-1 space-y-3 mb-8">
                                {guide.steps.map((step, si) => (
                                    <div key={si} className="flex gap-3 text-sm text-text-muted">
                                        <span className="text-xs font-mono font-bold text-primary/40 mt-0.5">{si + 1}.</span>
                                        {step}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                <a
                                    href={guide.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-elevated border border-border-subtle text-xs font-bold hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-[0.98]"
                                >
                                    Go to {guide.provider.split(' ')[0]}
                                </a>
                                <a
                                    href={guide.youtube}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/5 border border-red-500/20 text-xs font-bold text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-[0.98]"
                                >
                                    Video Guide
                                </a>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tip Section */}
                <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Key className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-lg font-bold text-text mb-1">Remember to set limits</h4>
                        <p className="text-sm text-text-muted leading-relaxed">
                            While these keys are free, many providers have rate limits or usage quotas. Keep an eye on your usage dashboards to ensure uninterrupted service!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
