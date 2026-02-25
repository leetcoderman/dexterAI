import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MessageSquare, Trash2, Search } from 'lucide-react'
import { useAppStore } from '../store'
import type { ConversationSummary, ChatMessage } from '@dexterai/registry-types'

function groupByDate(conversations: ConversationSummary[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const lastWeek = new Date(today.getTime() - 7 * 86400000)

  const groups: { label: string; items: ConversationSummary[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 Days', items: [] },
    { label: 'Older', items: [] }
  ]

  for (const conv of conversations) {
    const d = new Date(conv.updated_at)
    if (d >= today) groups[0].items.push(conv)
    else if (d >= yesterday) groups[1].items.push(conv)
    else if (d >= lastWeek) groups[2].items.push(conv)
    else groups[3].items.push(conv)
  }

  return groups.filter((g) => g.items.length > 0)
}

type SearchResult = ChatMessage & { conversation_title: string }

export default function ChatListScreen() {
  const navigate = useNavigate()
  const { conversations, loadConversations } = useAppStore()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) {
      setSearchResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const results = await window.dexterai.messages.search(search.trim())
      setSearchResults(results)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [search])

  const handleNewChat = async () => {
    const conv = await window.dexterai.conversations.create()
    if (conv) {
      navigate(`/chat/${conv.id}`)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await window.dexterai.conversations.delete(id)
    loadConversations()
  }

  const groups = groupByDate(conversations)
  const isSearching = search.trim().length > 0

  return (
    <div className="flex flex-col h-full pt-2">
      <div className="px-4 pb-1 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-text"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          searchResults.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-8">No results found</p>
          ) : (
            <div className="p-4 space-y-1">
              {searchResults.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate(`/chat/${r.conversation_id}`)}
                  className="w-full flex flex-col gap-0.5 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
                >
                  <p className="text-xs font-medium text-primary truncate">
                    {r.conversation_title || 'Untitled'}
                  </p>
                  <p className="text-sm text-text truncate">{r.content}</p>
                </button>
              ))}
            </div>
          )
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-3 py-16">
            <MessageSquare className="w-10 h-10 text-gray-300" />
            <p className="text-lg font-medium">No conversations yet</p>
            <p className="text-sm">Start a new chat to begin.</p>
            <button
              onClick={handleNewChat}
              className="mt-2 flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Chat
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {groups.map((group) => (
              <div key={group.label}>
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-1.5">
                  {group.label}
                </h3>
                <div className="space-y-0.5">
                  {group.items.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => navigate(`/chat/${conv.id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors group text-left"
                    >
                      <MessageSquare className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text truncate">
                          {conv.title || 'New Conversation'}
                        </p>
                        {conv.last_message_preview && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {conv.last_message_preview}
                          </p>
                        )}
                      </div>
                      {conv.message_count !== undefined && conv.message_count > 0 && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {conv.message_count}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDelete(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all shrink-0"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
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
