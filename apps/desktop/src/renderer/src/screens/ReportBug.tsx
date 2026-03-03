import { Mail, Github, Twitter, ExternalLink, Send, ArrowLeft } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import { useNavigate } from 'react-router-dom'

export default function ReportBug() {
    const navigate = useNavigate()

    const contactOptions = [
        {
            title: 'Email Support',
            description: 'Send a detailed bug report to our support email.',
            icon: Mail,
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
            hoverBg: 'hover:bg-blue-500/20',
            actions: [
                { name: 'Gmail', url: 'https://mail.google.com/mail/?view=cm&fs=1&to=shikharleetcoder@gmail.com&su=Bug%20Report%3A%20dexterAI' },
                { name: 'Yahoo', url: 'https://compose.mail.yahoo.com/?to=shikharleetcoder@gmail.com&subject=Bug%20Report%3A%20dexterAI' },
                { name: 'Mail App', url: 'mailto:shikharleetcoder@gmail.com?subject=Bug%20Report%3A%20dexterAI' }
            ]
        },
        {
            title: 'GitHub Issues',
            description: 'Open an issue on our official GitHub repository.',
            icon: Github,
            color: 'text-text',
            bg: 'bg-elevated',
            hoverBg: 'hover:bg-overlay',
            url: 'https://github.com/leetcoderman/dexterAI/issues/new'
        },
        {
            title: 'Direct Message',
            description: 'Reach out directly on X (formerly Twitter).',
            icon: Twitter,
            color: 'text-sky-500',
            bg: 'bg-sky-500/10',
            hoverBg: 'hover:bg-sky-500/20',
            url: 'https://x.com/Shikharl33t'
        }
    ]

    return (
        <div className="h-full overflow-y-auto p-8 bg-background">
            <div className="max-w-3xl mx-auto animate-fade-in">
                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Go back
                </button>

                {/* Header */}
                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold mb-4 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        Report a Bug
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight mb-4 text-text">Help us improve dexterAI</h1>
                    <p className="text-lg text-text-muted max-w-2xl leading-relaxed">
                        Found something that isn't working? We appreciate your feedback.
                        Choose your preferred way to report the issue below.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {contactOptions.map((option, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "group relative overflow-hidden p-8 rounded-3xl border border-border-subtle bg-surface transition-all duration-300 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5",
                                "before:absolute before:inset-0 before:bg-gradient-to-br before:from-transparent before:to-primary/5 before:opacity-0 hover:before:opacity-100 before:transition-opacity"
                            )}
                        >
                            <div className="relative flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
                                <div className="flex gap-6 items-start flex-1 min-w-0">
                                    <div className={cn("w-16 h-16 shrink-0 flex items-center justify-center rounded-2xl transition-transform group-hover:scale-110 duration-500", option.bg, option.color)}>
                                        <option.icon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold mb-2 text-text">{option.title}</h2>
                                        <p className="text-text-muted text-base leading-relaxed">{option.description}</p>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 w-full md:w-auto shrink-0 justify-end">
                                    {option.actions ? (
                                        option.actions.map((action, actionIdx) => (
                                            <a
                                                key={actionIdx}
                                                href={action.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-elevated text-sm font-bold text-text-secondary border border-border-subtle hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 shadow-sm active:scale-95 translate-y-0 hover:-translate-y-1"
                                            >
                                                {action.name}
                                                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                                            </a>
                                        ))
                                    ) : (
                                        <a
                                            href={option.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary text-sm font-bold text-white border border-primary shadow-glow hover:bg-primary-hover transition-all duration-200 active:scale-95 translate-y-0 hover:-translate-y-1 group/btn"
                                        >
                                            Continue
                                            <Send className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-0.5 transition-transform" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Support URL Reminder */}
                <div className="mt-12 p-6 rounded-2xl bg-elevated/30 border border-border-subtle text-center">
                    <p className="text-sm text-text-muted">
                        For urgent security concerns, please email <span className="text-primary font-bold">shikharleetcoder@gmail.com</span> directly.
                    </p>
                </div>
            </div>
        </div>
    )
}
