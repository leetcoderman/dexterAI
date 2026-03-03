import { useNavigate } from 'react-router-dom'
import {
    ArrowLeft,
    ShieldCheck,
    Zap,
    Linkedin,
    Github,
    Globe,
    Lock,
    Database,
    EyeOff,
    Gift,
    Info
} from 'lucide-react'
import logo from '../assets/logo.jpeg'

const CAPABILITIES = [
    'Unified Model Catalogue with 100+ LLMs',
    'Local Context-Aware Chat',
    'Integrated Memory System',
    'Providers like Nvidia, Github, Anthropic, OpenAI'
]

const ROADMAP = [
    'Addition of more adapters (like OpenRouter, etc. which provide free API keys for testing)',
]

const BUGS = [
    'Subtle hydration issues on first launch',
    'Deepgram connection timing for large files',
    'Sidebar focus state in compact mode'
]

export default function InfoScreen() {
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
                    <h1 className="text-5xl font-extrabold tracking-tight text-text">About dexterAI</h1>
                    <p className="text-xl text-text-muted leading-relaxed max-w-2xl">
                        A state-of-the-art AI developer workbench designed for speed, privacy, and absolute local
                        control.
                    </p>
                </div>

                {/* Security Deep Dive */}
                <section className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-emerald-500/10 pointer-events-none">
                        <ShieldCheck className="w-48 h-48 -mr-12 -mt-12 rotate-12" />
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-3 text-emerald-500 mb-6">
                            <ShieldCheck className="w-8 h-8" />
                            <h2 className="text-3xl font-bold">Security & Trust</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4 p-6 rounded-2xl bg-surface/50 border border-border-subtle">
                                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                                    <Lock className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold">OS Keychain Storage</h3>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    We leverage <span className="text-text font-bold">keytar</span> to store your API
                                    keys in the native macOS Keychain or Windows Credential Manager. Your sensitive
                                    keys are encrypted at the OS level and <span className="text-text font-bold">never</span> stored
                                    in plain text or synced to any cloud.
                                </p>
                            </div>

                            <div className="space-y-4 p-6 rounded-2xl bg-surface/50 border border-border-subtle">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <Database className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold">Local Data Sovereignty</h3>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    All conversations, file trees, and project metadata live in a local{' '}
                                    <span className="text-text font-bold">SQLite database</span> on your machine. We
                                    perform zero data harvesting. Your reasoning and code stay private by default.
                                </p>
                            </div>

                            <div className="space-y-4 p-6 rounded-2xl bg-surface/50 border border-border-subtle">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold">Direct Communication</h3>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Your requests travel directly from your device to the inference provider (OpenAI,
                                    Anthropic, etc.). There is no man-in-the-middle or telemetry server logging your
                                    prompts.
                                </p>
                            </div>

                            <div className="space-y-4 p-6 rounded-2xl bg-surface/50 border border-border-subtle">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <EyeOff className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold">Zero Telemetry</h3>
                                <p className="text-sm text-text-muted leading-relaxed">
                                    Most apps track how you use them. We don't. We have zero analytics, zero tracking
                                    pixels, and zero background uploaders. Performance is for your device, not our
                                    metrics.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Grid for Capabilities & FAQs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-text">
                    {/* Capabilities */}
                    <div className="p-8 rounded-3xl bg-surface border border-border-subtle space-y-6">
                        <div className="flex items-center gap-3 text-primary">
                            <Zap className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Current Capabilities</h2>
                        </div>
                        <ul className="space-y-3">
                            {CAPABILITIES.map((cap, i) => (
                                <li key={i} className="flex gap-3 text-sm text-text-muted">
                                    <span className="text-primary font-bold">/</span>
                                    {cap}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* FAQ Section */}
                    <div className="p-8 rounded-3xl bg-surface border border-border-subtle space-y-8">
                        <div className="flex items-center gap-3 text-violet-500">
                            <Info className="w-6 h-6" />
                            <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                        </div>

                        <div className="space-y-6">
                            {/* Roadmap FAQ */}
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-text">What is planned for the future?</p>
                                <ul className="space-y-2">
                                    {ROADMAP.map((road, i) => (
                                        <li key={i} className="flex gap-2 text-[13px] text-text-muted leading-tight">
                                            <span className="text-blue-500 font-bold">→</span>
                                            {road}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Bugs FAQ */}
                            <div className="space-y-3">
                                <p className="text-sm font-bold text-text">Are there any known issues?</p>
                                <ul className="space-y-2">
                                    {BUGS.map((bug, i) => (
                                        <li key={i} className="flex gap-2 text-[13px] text-text-muted leading-tight">
                                            <span className="text-red-500 font-bold">!</span>
                                            {bug}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Free Keys FAQ */}
                            <div className="pt-4 border-t border-border-subtle">
                                <p className="text-sm font-bold text-text mb-3">How do I connect free API keys?</p>
                                <button
                                    onClick={() => navigate('/free-keys')}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-500 text-[13px] font-bold hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                >
                                    <Gift className="w-4 h-4" />
                                    View Free Keys Guide
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Builder Profile */}
                <section className="p-10 rounded-[3rem] bg-elevated border border-border-subtle relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-rose-500 p-1 shadow-glow overflow-hidden">
                            <img
                                src={logo}
                                alt="dexterAI Logo"
                                className="w-full h-full rounded-full object-cover bg-background"
                            />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-3xl font-bold tracking-tight">dexterAI</h2>
                            <p className="text-lg text-text-muted italic max-w-xl">
                                Bridging the gap between intent and implementation. Focused on building AI tools
                                that feel like extensions of the developer's mind.
                            </p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-3">
                            <a
                                href="https://www.linkedin.com/in/dexter-ai-7bb7573b4/"
                                target="_blank"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600/10 text-blue-600 text-sm font-bold hover:bg-blue-600 hover:text-white transition-colors"
                                rel="noreferrer"
                            >
                                <Linkedin className="w-4 h-4" /> LinkedIn
                            </a>
                            <a
                                href="https://github.com/leetcoderman"
                                target="_blank"
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-text/10 text-text text-sm font-bold hover:bg-text hover:text-background transition-colors"
                                rel="noreferrer"
                            >
                                <Github className="w-4 h-4" /> GitHub
                            </a>
                            <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-border-subtle text-text-muted text-sm font-bold italic">
                                Website <span className="text-[10px] uppercase tracking-widest">(Coming Soon)</span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
