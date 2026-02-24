import { useState, useEffect } from 'react'
import { Pin, PinOff, Trash2, Brain } from 'lucide-react'
import type { Memory } from '@dexterai/registry-types'

export default function MemoryScreen() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const load = async () => {
    const list = await window.dexterai.memory.list()
    setMemories(list)
  }

  useEffect(() => {
    load()
  }, [])

  const handleDelete = async (id: string) => {
    await window.dexterai.memory.delete(id)
    load()
  }

  const handleTogglePin = async (id: string) => {
    await window.dexterai.memory.togglePin(id)
    load()
  }

  const handleEditSave = async (m: Memory) => {
    await window.dexterai.memory.save({ id: m.id, key: m.key, content: editContent })
    setEditingId(null)
    load()
  }

  // Group by key
  const grouped = memories.reduce<Record<string, Memory[]>>((acc, m) => {
    if (!acc[m.key]) acc[m.key] = []
    acc[m.key].push(m)
    return acc
  }, {})

  const totalTokens = memories.reduce((sum, m) => sum + Math.ceil(m.content.length / 4), 0)

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border bg-background shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text">Memories</h2>
        <span className="text-[10px] text-gray-400">
          {memories.length} memories ~ {totalTokens} tokens
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3 py-16">
            <Brain className="w-10 h-10 text-gray-300" />
            <p className="text-lg font-medium">No memories yet</p>
            <p className="text-sm">Memories are automatically extracted from conversations.</p>
          </div>
        ) : (
          <div className="max-w-2xl space-y-5">
            {Object.entries(grouped).map(([key, items]) => (
              <div key={key}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  {key}
                </h3>
                <div className="space-y-1.5">
                  {items.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-start gap-2 px-3 py-2 rounded-lg border border-border bg-surface group"
                    >
                      {editingId === m.id ? (
                        <div className="flex-1">
                          <textarea
                            autoFocus
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            className="w-full text-sm border border-border rounded px-2 py-1 bg-background text-text resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <div className="flex gap-1.5 mt-1">
                            <button
                              onClick={() => handleEditSave(m)}
                              className="text-[10px] px-2 py-0.5 bg-primary text-white rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-[10px] px-2 py-0.5 border border-border rounded text-text-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="flex-1 text-sm text-text cursor-pointer"
                          onClick={() => {
                            setEditingId(m.id)
                            setEditContent(m.content)
                          }}
                          title="Click to edit"
                        >
                          {m.content}
                        </p>
                      )}
                      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleTogglePin(m.id)}
                          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5"
                          title={m.is_pinned ? 'Unpin' : 'Pin'}
                        >
                          {m.is_pinned ? (
                            <PinOff className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Pin className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1 rounded hover:bg-red-500/10"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
