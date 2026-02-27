import { useState, useRef, useEffect } from 'react'
import { Pencil, Check } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'

interface EditableTitleProps {
    value: string
    onSave: (newValue: string) => Promise<void>
    className?: string
    textClassName?: string
    inputClassName?: string
    showEditIcon?: boolean
    clickToEdit?: boolean
}

export default function EditableTitle({
    value,
    onSave,
    className,
    textClassName,
    inputClassName,
    showEditIcon = true,
    clickToEdit = true
}: EditableTitleProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [tempValue, setTempValue] = useState(value)
    const [isSaving, setIsSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.focus()
            inputRef.current?.select()
        }
    }, [isEditing])

    const handleSave = async () => {
        if (tempValue.trim() && tempValue !== value) {
            setIsSaving(true)
            try {
                await onSave(tempValue.trim())
                setIsEditing(false)
            } catch (e) {
                console.error('Failed to save title:', e)
            } finally {
                setIsSaving(false)
            }
        } else {
            setIsEditing(false)
            setTempValue(value)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave()
        } else if (e.key === 'Escape') {
            setIsEditing(false)
            setTempValue(value)
        }
    }

    if (isEditing) {
        return (
            <div className={cn('flex items-center gap-1.5 min-w-0', className)}>
                <input
                    ref={inputRef}
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleSave}
                    disabled={isSaving}
                    className={cn(
                        'flex-1 bg-elevated border border-primary/50 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 min-w-0',
                        inputClassName
                    )}
                />
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        handleSave()
                    }}
                    disabled={isSaving}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-primary shrink-0"
                >
                    {isSaving ? (
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <Check className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>
        )
    }

    return (
        <div
            className={cn('inline-flex items-center gap-1.5 min-w-0 group/title cursor-text w-fit max-w-full', className)}
            onClick={(e) => {
                if (clickToEdit) {
                    e.stopPropagation()
                    setIsEditing(true)
                }
            }}
            title={clickToEdit ? "Click to edit title" : undefined}
        >
            <span className={cn('truncate', textClassName)}>
                {value || 'Untitled Conversation'}
            </span>
            {showEditIcon && (
                <button
                    onClick={(e) => {
                        e.stopPropagation()
                        setIsEditing(true)
                    }}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0"
                    title="Edit text"
                >
                    <Pencil className="w-3 h-3 text-text-muted" />
                </button>
            )}
        </div>
    )
}
