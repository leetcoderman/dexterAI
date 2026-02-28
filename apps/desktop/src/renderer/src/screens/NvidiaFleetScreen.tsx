import { useState, useMemo } from 'react'
import {
    Zap,
    Cpu,
    Brain,
    Code,
    Target,
    Shield,
    Layers,
    Database,
    ArrowUpRight,
    Sparkles,
    CheckCircle2
} from 'lucide-react'
import { cn } from '@dexterai/shared-utils'

const MODELS = [
    {
        id: 'maverick',
        name: 'Llama 4 Maverick',
        specialty: 'High-Intelligence Flagship',
        description: 'Autonomous reasoning over 1M tokens. The crown jewel of the Blackwell era.',
        metrics: { reasoning: 10, throughput: 7, context: 10 },
        icon: Shield,
        color: 'from-blue-500 to-cyan-400'
    },
    {
        id: 'terminus',
        name: 'DeepSeek V3.1 Terminus',
        specialty: 'Agentic CLI & DevOps',
        description: 'Precision-engineered for terminal stability and zero-shot tool proficiency.',
        metrics: { reasoning: 9, throughput: 9, context: 7 },
        icon: Code,
        color: 'from-purple-500 to-pink-400'
    },
    {
        id: 'nano',
        name: 'Nemotron-3 Nano',
        specialty: 'Efficiency King',
        description: 'Hybrid Mamba architecture delivering sub-second first-token response.',
        metrics: { reasoning: 7, throughput: 10, context: 10 },
        icon: Zap,
        color: 'from-green-500 to-emerald-400'
    },
    {
        id: 'cosmos',
        name: 'Cosmos Reason2',
        specialty: 'Physical AI Specialist',
        description: 'Native spatio-temporal logic for robotics and video causality.',
        metrics: { reasoning: 9, throughput: 8, context: 8 },
        icon: Brain,
        color: 'from-orange-500 to-amber-400'
    }
]

const MATRIX_DATA = [
    { name: 'Llama 4 Maverick', params: '400B (17B Active)', context: '1M', strength: 'High-Intelligence', score: 5 },
    { name: 'DeepSeek V3.1 Terminus', params: '671B (MoE)', context: '128K', strength: 'Agentic CLI', score: 5 },
    { name: 'Nemotron-3 Nano', params: '30B (3.2B Active)', context: '1M', strength: 'Multi-agent Swarms', score: 4 },
    { name: 'Cosmos Reason2', params: '8B (VLA)', context: '256K', strength: 'Physical AI', score: 5 },
    { name: 'Qwen 3 Coder 480B', params: '480B (MoE)', context: '128K', strength: 'Software Engineering', score: 5 },
    { name: 'Minimax-M2.1', params: 'Linear MoE', context: '4M', strength: 'Repo Refactoring', score: 5 },
]

export default function NvidiaFleetScreen() {
    const [activeTab, setActiveTab] = useState<'overview' | 'matrix' | 'wizard'>('overview')
    const [wizardAnswers, setWizardAnswers] = useState<Record<string, string>>({})

    const recommendations = useMemo(() => {
        if (wizardAnswers.need === 'code') return MODELS.find(m => m.id === 'terminus')
        if (wizardAnswers.need === 'speed') return MODELS.find(m => m.id === 'nano')
        if (wizardAnswers.need === 'reasoning') return MODELS.find(m => m.id === 'maverick')
        if (wizardAnswers.need === 'robotics') return MODELS.find(m => m.id === 'cosmos')
        return null
    }, [wizardAnswers])

    return (
        <div className="h-full overflow-y-auto bg-[#0a0a0b] text-white selection:bg-[#76b900]/30 font-sans">
            {/* Dynamic Background Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
                <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-[#76b900] blur-[150px] rounded-full animate-pulse" />
                <div className="absolute top-[20%] -right-[10%] w-[40%] h-[50%] bg-blue-600 blur-[150px] rounded-full animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-8 py-16">
                {/* Header */}
                <header className="mb-20 text-center animate-fade-in-up">
                    <div className="flex items-center justify-center gap-2 mb-6">
                        <div className="px-3 py-1 rounded-full bg-[#76b900]/10 border border-[#76b900]/30 text-[#76b900] text-[10px] font-black uppercase tracking-[0.3em]">
                            Fleet Intelligence Report
                        </div>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 leading-none bg-clip-text text-transparent bg-gradient-to-b from-white to-white/40">
                        NVIDIA LEAP 2026
                    </h1>
                    <p className="max-w-3xl mx-auto text-xl text-gray-400 font-medium leading-relaxed">
                        Transitioning from monolithic models to a symphony of hyper-specialized agentic microservices.
                        Optimized for <span className="text-white font-bold">Blackwell Architecture</span> and <span className="text-white font-bold">NIM Microservices</span>.
                    </p>
                </header>

                {/* Navigation Tabs */}
                <div className="flex justify-center mb-16">
                    <div className="bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-white/10 flex gap-1">
                        {[
                            { id: 'overview', label: 'Fleet Overview', icon: Layers },
                            { id: 'matrix', label: 'Comparison Matrix', icon: Target },
                            { id: 'wizard', label: 'Workflow Wizard', icon: Sparkles },
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                                    activeTab === tab.id
                                        ? "bg-[#76b900] text-black shadow-[0_0_20px_rgba(118,185,0,0.4)]"
                                        : "text-gray-400 hover:text-white hover:bg-white/5"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <section className="space-y-12 animate-fade-in">
                        {/* Transition Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                            {[
                                { label: 'Throughput', value: '3.3x', desc: 'Higher TPS vs 2025', icon: Zap },
                                { label: 'Latency', value: '< 1.0s', desc: 'First Token Average', icon: Clock },
                                { label: 'Architecture', value: 'MoE-Native', desc: 'Smarter Efficiency', icon: Cpu },
                            ].map(stat => (
                                <div key={stat.label} className="p-8 rounded-[32px] bg-white/5 border border-white/10 hover:border-[#76b900]/40 transition-all group">
                                    <stat.icon className="w-8 h-8 text-[#76b900] mb-6 group-hover:scale-110 transition-transform" />
                                    <div className="text-4xl font-black mb-1">{stat.value}</div>
                                    <div className="text-xs font-black uppercase text-gray-500 tracking-widest">{stat.label}</div>
                                    <div className="mt-4 text-sm text-gray-400">{stat.desc}</div>
                                </div>
                            ))}
                        </div>

                        {/* Heavy Hitters Grid */}
                        <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-[#76b900]" />
                            The Heavy Hitters
                        </h2>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {MODELS.map(model => (
                                <div key={model.id} className="group relative p-10 rounded-[40px] bg-white/5 border border-white/10 overflow-hidden hover:bg-white/[0.08] transition-all">
                                    <div className={cn("absolute top-0 right-0 w-64 h-64 blur-[100px] opacity-10 group-hover:opacity-20 transition-opacity bg-gradient-to-br", model.color)} />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-8">
                                            <div className="p-4 rounded-2xl bg-black/50 border border-white/10">
                                                <model.icon className="w-8 h-8 text-white" />
                                            </div>
                                            <div className="px-3 py-1 rounded-full bg-white/10 text-[10px] font-black uppercase tracking-widest text-[#76b900]">
                                                {model.specialty}
                                            </div>
                                        </div>

                                        <h3 className="text-4xl font-black mb-4 group-hover:text-[#76b900] transition-colors">{model.name}</h3>
                                        <p className="text-lg text-gray-400 mb-10 leading-relaxed font-medium">
                                            {model.description}
                                        </p>

                                        <div className="grid grid-cols-3 gap-6 py-6 border-t border-white/10">
                                            {Object.entries(model.metrics).map(([key, val]) => (
                                                <div key={key}>
                                                    <div className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">{key}</div>
                                                    <div className="flex gap-1">
                                                        {[...Array(10)].map((_, i) => (
                                                            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i < val ? "bg-[#76b900]" : "bg-white/10")} />
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {activeTab === 'matrix' && (
                    <section className="animate-fade-in-up">
                        <div className="bg-white/5 rounded-[40px] border border-white/10 overflow-hidden backdrop-blur-sm">
                            <div className="p-8 border-b border-white/10 flex items-center justify-between">
                                <h3 className="text-2xl font-black">Optimization Matrix</h3>
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Info className="w-4 h-4" />
                                    Detailed performance benchmark
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/[0.02]">
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Model Name</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Params</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Context</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Core Strength</th>
                                            <th className="px-8 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Reasoning</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MATRIX_DATA.map((row, i) => (
                                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors group">
                                                <td className="px-8 py-6 font-bold group-hover:text-[#76b900]">{row.name}</td>
                                                <td className="px-8 py-6 text-sm text-gray-400 font-mono">{row.params}</td>
                                                <td className="px-8 py-6 text-sm text-gray-400 font-mono">{row.context}</td>
                                                <td className="px-8 py-6 text-sm font-medium">{row.strength}</td>
                                                <td className="px-8 py-6">
                                                    <div className="flex gap-1">
                                                        {[...Array(5)].map((_, j) => (
                                                            <div key={j} className={cn("w-1.5 h-1.5 rounded-full", j < row.score ? "bg-amber-400" : "bg-white/10")} />
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                )}

                {activeTab === 'wizard' && (
                    <section className="max-w-4xl mx-auto animate-zoom-in">
                        <div className="relative p-12 rounded-[48px] bg-gradient-to-br from-[#121214] to-black border border-white/10 shadow-2xl overflow-hidden">
                            {/* Decorative Gradient Overlay */}
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[#76b900] blur-[150px] opacity-10 rounded-full -translate-y-1/2 translate-x-1/2" />

                            {!recommendations ? (
                                <div className="relative z-10 text-center space-y-12">
                                    <div className="space-y-4">
                                        <h3 className="text-4xl font-black italic">Workflow Wizard</h3>
                                        <p className="text-gray-400">Identify the optimal engine for your current directive.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[
                                            { id: 'code', label: 'Full Repo Refactor', icon: Code, desc: 'Highest coding proficiency' },
                                            { id: 'speed', label: 'Agentic Swarms', icon: Zap, desc: 'Max throughput & sub-second latency' },
                                            { id: 'reasoning', label: 'Advanced Reasoning', icon: Brain, desc: 'Graduate-level problem solving' },
                                            { id: 'robotics', label: 'Robotics & Vision', icon: Target, desc: 'Physical world intelligence' },
                                        ].map(ans => (
                                            <button
                                                key={ans.id}
                                                onClick={() => setWizardAnswers({ need: ans.id })}
                                                className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:border-[#76b900] hover:bg-[#76b900]/5 transition-all text-left group"
                                            >
                                                <ans.icon className="w-8 h-8 text-[#76b900] mb-6 group-hover:scale-110 transition-transform" />
                                                <div className="font-bold text-xl mb-1">{ans.label}</div>
                                                <div className="text-sm text-gray-500">{ans.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="relative z-10 text-center animate-fade-in-up">
                                    <div className="inline-flex items-center justify-center p-4 rounded-3xl bg-[#76b900]/10 border border-[#76b900]/30 mb-8">
                                        <CheckCircle2 className="w-12 h-12 text-[#76b900]" />
                                    </div>
                                    <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest mb-2">Recommended Engine</h3>
                                    <div className="text-6xl font-black mb-10 text-white">{recommendations.name}</div>

                                    <div className="max-w-xl mx-auto p-1 rounded-[32px] bg-gradient-to-r from-white/10 to-transparent mb-12">
                                        <div className="bg-black/80 backdrop-blur-xl p-8 rounded-[30px] text-left">
                                            <div className="flex items-center gap-2 mb-4 text-[#76b900] text-xs font-black uppercase tracking-widest">
                                                <Database className="w-3.5 h-3.5" />
                                                Deployment Strategy
                                            </div>
                                            <p className="text-gray-300 leading-relaxed italic">
                                                "{recommendations.description}"
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-center gap-4">
                                        <button
                                            onClick={() => setWizardAnswers({})}
                                            className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold hover:bg-white/10 transition-all"
                                        >
                                            Reset Wizard
                                        </button>
                                        <button
                                            className="px-8 py-4 rounded-2xl bg-[#76b900] text-black text-sm font-bold shadow-glow hover:scale-[1.05] transition-all flex items-center gap-2"
                                        >
                                            Launch Model
                                            <ArrowUpRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* Footer Technical Detail */}
                <footer className="mt-32 pt-16 border-t border-white/5 text-center">
                    <div className="flex flex-wrap justify-center gap-12 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
                        <div className="flex items-center gap-2 font-black tracking-tighter text-xl">
                            <Shield className="w-6 h-6" /> BLACKWELL OPTIMIZED
                        </div>
                        <div className="flex items-center gap-2 font-black tracking-tighter text-xl">
                            <Cpu className="w-6 h-6" /> TRT-LLM ENGINE
                        </div>
                        <div className="flex items-center gap-2 font-black tracking-tighter text-xl">
                            <Layers className="w-6 h-6" /> NVIDIA NIM MICROSERVICES
                        </div>
                    </div>
                    <p className="mt-12 text-[10px] font-black uppercase tracking-[0.4em] text-gray-600">
                        © 2026 ModelForge Intelligence Division
                    </p>
                </footer>
            </div>
        </div>
    )
}

function Clock(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
        </svg>
    )
}

function Info(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
        </svg>
    )
}
