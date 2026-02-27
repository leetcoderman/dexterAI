import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    Sparkles,
    Brain,
    Zap,
    Code,
    Target,
    Clock,
    Tag,
    Cpu,
    Layers
} from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import { RegistryModel } from '@dexterai/registry-types'
import { useAppStore } from '../store'

const METRIC_LABELS: Record<string, { label: string; icon: any; color: string }> = {
    speed: { label: 'Inference Speed', icon: Zap, color: 'text-amber-400' },
    reasoning: { label: 'Reasoning Logic', icon: Brain, color: 'text-purple-400' },
    coding: { label: 'Software Engineering', icon: Code, color: 'text-blue-400' }
}

export default function ModelDetailScreen() {
    const { modelId } = useParams<{ modelId: string }>()
    const navigate = useNavigate()
    const [model, setModel] = useState<RegistryModel | null>(null)
    const [loading, setLoading] = useState(true)
    const connectedProviders = useAppStore((s) => s.connectedProviders)

    useEffect(() => {
        async function loadModel() {
            if (!modelId) return
            setLoading(true)
            try {
                const models = await window.dexterai.registry.getModels()
                const found = models.find(m => m.id === decodeURIComponent(modelId))
                if (found) setModel(found)
            } catch (e) {
                console.error('Failed to load model details', e)
            } finally {
                setLoading(false)
            }
        }
        loadModel()
    }, [modelId])

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center space-y-4 animate-pulse">
                <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-text-muted">Loading intelligence profile...</p>
            </div>
        )
    }

    if (!model) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6">
                    <ArrowLeft className="w-8 h-8 text-text-muted" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Model not found</h2>
                <p className="text-text-muted mb-8 max-w-md">The model you are looking for does not exist in our current registry.</p>
                <button onClick={() => navigate('/catalogue')} className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold">
                    Back to Catalogue
                </button>
            </div>
        )
    }

    const isConnected = connectedProviders.includes(model.provider_id)

    return (
        <div className="h-full overflow-y-auto bg-background selection:bg-primary/20">
            {/* Navigation Header */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 px-8 py-4 flex items-center justify-between">
                <button
                    onClick={() => navigate('/catalogue')}
                    className="flex items-center gap-2 text-sm font-bold text-text-muted hover:text-text transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Catalogue
                </button>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/test/${encodeURIComponent(model.id)}`, { state: { providerId: model.provider_id } })}
                        className="px-5 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        Launch Testing
                    </button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-8 lg:p-12 animate-fade-in">
                {/* Hero Section */}
                <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
                    <div className="space-y-4 max-w-2xl">
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                {model.category.replace('_', ' ')}
                            </span>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                isConnected ? "bg-success/10 text-success border-success/20" : "bg-text-muted/10 text-text-muted border-text-muted/20"
                            )}>
                                {isConnected ? 'Connected' : 'Locked'}
                            </span>
                        </div>
                        <h1 className="text-5xl lg:text-7xl font-black tracking-tight text-text leading-tight">
                            {model.name}
                        </h1>
                        <p className="text-xl text-text-muted leading-relaxed italic">
                            "{model.description}"
                        </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end">
                        <div className="text-[10px] font-black uppercase text-text-muted mb-2 tracking-widest">Powered by</div>
                        <div className="px-6 py-3 rounded-2xl bg-surface border border-border flex items-center gap-3 shadow-sm">
                            <Sparkles className="w-5 h-5 text-primary" />
                            <span className="text-xl font-bold">{model.provider_id.toUpperCase().replace('_NIM', ' NIM')}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                    {/* Performance Radar (Detailed Metrics) */}
                    <div className="lg:col-span-2 p-8 rounded-[32px] bg-elevated border border-border/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Target className="w-32 h-32" />
                        </div>

                        <h3 className="text-xl font-black mb-8 flex items-center gap-3">
                            <Cpu className="w-5 h-5 text-primary" />
                            Intelligence Metrics
                        </h3>

                        <div className="space-y-10 relative z-10">
                            {['speed', 'reasoning', 'coding'].map((m) => {
                                const metric = model.performance_metrics?.[m as keyof typeof model.performance_metrics]
                                const value = typeof metric === 'number' ? metric : 0
                                const info = METRIC_LABELS[m]

                                return (
                                    <div key={m} className="space-y-4">
                                        <div className="flex items-center justify-between font-bold">
                                            <div className="flex items-center gap-2.5 text-text">
                                                <info.icon className={cn("w-5 h-5", info.color)} />
                                                {info.label}
                                            </div>
                                            <span className="text-sm font-mono text-text-muted">
                                                {typeof metric === 'string' ? metric : `${value}/10`}
                                            </span>
                                        </div>
                                        <div className="h-3 w-full bg-background rounded-full overflow-hidden border border-border/30">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)] bg-primary")}
                                                style={{ width: `${value * 10}%` }}
                                            />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Quick Specs Sidebar */}
                    <div className="space-y-8">
                        <div className="p-8 rounded-[32px] bg-surface border border-border shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest text-text-muted mb-6">Technical Specs</h3>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                                        <Layers className="w-5 h-5 text-text-muted" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-text-muted tracking-tighter">Context Window</div>
                                        <div className="text-lg font-bold">{(model.context_window || 0).toLocaleString()} tokens</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                                        <Clock className="w-5 h-5 text-text-muted" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-text-muted tracking-tighter">Knowledge Cutoff</div>
                                        <div className="text-lg font-bold">{model.knowledge_cutoff || 'Unknown'}</div>
                                    </div>
                                </div>
                                {model.pricing && (
                                    <div className="flex items-center gap-4 border-t border-border pt-6 mt-6">
                                        <div className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                                            <Tag className="w-5 h-5 text-text-muted" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black uppercase text-text-muted tracking-tighter">Efficiency Cost</div>
                                            <div className="text-sm font-medium">Input: ${model.pricing.input_per_1m_tokens}/1M</div>
                                            <div className="text-sm font-medium">Output: ${model.pricing.output_per_1m_tokens}/1M</div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Deep Dive Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
                    <div>
                        <h3 className="text-4xl font-black mb-8 leading-tight">Strategic Overview</h3>
                        <div className="prose prose-invert max-w-none text-xl leading-relaxed text-text-muted">
                            {model.description_long || "This model represents a breakthrough in large-scale machine learning, offering state-of-the-art performance across diverse logic and linguistic tasks."}
                        </div>
                    </div>
                    <div className="space-y-12">
                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">Core Capabilities</h4>
                            <div className="flex flex-wrap gap-3">
                                {(model.capabilities || ['Reasoning', 'Translation', 'Logic']).map((c) => (
                                    <div key={c} className="px-5 py-3 rounded-2xl bg-surface border border-border font-bold text-sm hover:border-primary/50 hover:text-primary transition-all">
                                        {c}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6">Supported Modalities</h4>
                            <div className="flex flex-wrap gap-4">
                                {model.supported_features?.map((f) => (
                                    <div key={f} className="flex items-center gap-3 text-sm font-bold opacity-80">
                                        <div className="w-2 h-2 rounded-full bg-primary shadow-glow" />
                                        {f.replace('_', ' ')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
