import { useState, useRef, useCallback } from 'react'
import { Search, X, FileCode, Loader2 } from 'lucide-react'
import { cn } from '@dexterai/shared-utils'

interface SearchMatch {
  filePath: string
  line: number
  text: string
}

interface SearchPanelProps {
  rootPath: string
  onResultClick: (filePath: string, fileName: string) => void
  onClose: () => void
}

export default function SearchPanel({ rootPath, onResultClick, onClose }: SearchPanelProps) {
  const [query, setQuery] = useState('')
  const [filePattern, setFilePattern] = useState('')
  const [results, setResults] = useState<SearchMatch[]>([])
  const [truncated, setTruncated] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<any>(null)

  const doSearch = useCallback(async (q: string, fp: string) => {
    if (!q.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await window.dexterai.fs.search({
        rootPath,
        query: q,
        filePattern: fp || undefined
      })
      setResults(res.results)
      setTruncated(res.truncated)
      setHasSearched(true)
    } catch (e) {
      console.error('Search failed:', e)
    } finally {
      setIsSearching(false)
    }
  }, [rootPath])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value, filePattern), 300)
  }

  const handleFilePatternChange = (value: string) => {
    setFilePattern(value)
    if (query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => doSearch(query, value), 300)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      doSearch(query, filePattern)
    }
    if (e.key === 'Escape') onClose()
  }

  // Group results by file
  const grouped: Record<string, SearchMatch[]> = {}
  for (const m of results) {
    if (!grouped[m.filePath]) grouped[m.filePath] = []
    grouped[m.filePath].push(m)
  }

  return (
    <div className="flex flex-col h-full bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border-subtle shrink-0">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-widest">
          Search
        </span>
        <button onClick={onClose} className="p-1 rounded hover:bg-elevated transition-colors">
          <X className="w-3.5 h-3.5 text-text-muted" />
        </button>
      </div>

      {/* Inputs */}
      <div className="px-3 py-2 space-y-2 border-b border-border-subtle shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search in files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-md bg-background border border-border-subtle text-[12px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary animate-spin" />
          )}
        </div>
        <input
          value={filePattern}
          onChange={(e) => handleFilePatternChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="File filter (e.g. *.tsx)"
          className="w-full px-3 py-1.5 rounded-md bg-background border border-border-subtle text-[12px] text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50"
        />
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!hasSearched && !isSearching && (
          <div className="flex flex-col items-center justify-center h-full text-text-muted py-8">
            <Search className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-xs opacity-60">Type to search across project files</p>
          </div>
        )}

        {hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-text-muted">
            <p className="text-xs">No results found</p>
          </div>
        )}

        {Object.entries(grouped).map(([filePath, matches]) => (
          <div key={filePath} className="border-b border-border-subtle/50">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated/30">
              <FileCode className="w-3 h-3 text-text-muted shrink-0" />
              <span className="text-[11px] font-mono font-bold text-text-secondary truncate">
                {filePath}
              </span>
              <span className="text-[10px] text-text-muted ml-auto shrink-0">
                {matches.length}
              </span>
            </div>
            {matches.map((m, i) => (
              <button
                key={i}
                onClick={() => onResultClick(m.filePath, m.filePath.split('/').pop() ?? m.filePath)}
                className={cn(
                  'flex items-start gap-2 w-full text-left px-3 py-1 hover:bg-elevated/50 transition-colors'
                )}
              >
                <span className="text-[10px] text-text-muted font-mono shrink-0 pt-0.5 w-8 text-right">
                  {m.line}
                </span>
                <span className="text-[11px] font-mono text-text-secondary truncate leading-relaxed">
                  {m.text}
                </span>
              </button>
            ))}
          </div>
        ))}

        {truncated && (
          <div className="px-3 py-2 text-[10px] text-warning text-center">
            Results truncated at 100 matches
          </div>
        )}
      </div>
    </div>
  )
}
