import { ShieldCheck, Info } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import { useNavigate } from 'react-router-dom'

interface SecurityBannerProps {
    className?: string
    compact?: boolean
}

export default function SecurityBanner({ className, compact }: SecurityBannerProps) {
    const navigate = useNavigate()

    if (compact) {
        return (
            <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold text-emerald-500/80 animate-fade-in",
                className
            )}>
                <ShieldCheck className="w-3 h-3" />
                <span>Keys stay local in OS Keychain. No cloud sync.</span>
            </div>
        )
    }

    return (
        <div className={cn(
            "relative overflow-hidden group p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col md:flex-row items-center gap-4 animate-fade-in",
            className
        )}>
            <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-inner group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                    <h4 className="text-sm font-bold text-emerald-500">Your Security is Our Priority</h4>
                    <p className="text-xs text-text-muted leading-relaxed">
                        API keys are encrypted in your <span className="text-text font-bold">Local OS Keychain</span>.
                        Conversations live in a <span className="text-text font-bold">Local SQLite Database</span>.
                        Zero telemetry. Zero tracking.
                    </p>
                </div>
            </div>

            <button
                onClick={() => navigate('/about')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-all active:scale-95 whitespace-nowrap"
            >
                <Info className="w-3.5 h-3.5" />
                Learn More
            </button>
        </div>
    )
}
