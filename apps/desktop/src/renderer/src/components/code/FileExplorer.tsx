import { useState, useCallback } from 'react'
import { cn } from '@dexterai/shared-utils'
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  Loader2,
  RefreshCw,
  Search,
  FolderOpen as FolderOpenIcon
} from 'lucide-react'

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileTreeNode[]
}

interface FileExplorerProps {
  rootPath: string
  tree: FileTreeNode[]
  onFileSelect: (path: string, name: string) => void
  onRefresh: () => void
  onChangeFolder: () => void
  onSearch?: () => void
  activeFilePath?: string
}

export function detectLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    py: 'python',
    rs: 'rust',
    go: 'go',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    svg: 'xml',
    sql: 'sql',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    toml: 'ini',
    env: 'ini',
    dockerfile: 'dockerfile',
    graphql: 'graphql',
    gql: 'graphql',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    rb: 'ruby',
    php: 'php',
    lua: 'lua',
    vue: 'html',
    svelte: 'html',
    astro: 'html',
    mdx: 'markdown',
    cs: 'csharp',
    sass: 'sass',
    proto: 'protobuf',
    ps1: 'powershell',
    bat: 'bat',
    clj: 'clojure',
    ex: 'elixir',
    exs: 'elixir'
  }
  return map[ext] ?? 'plaintext'
}

function getFileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (
    [
      'ts',
      'tsx',
      'js',
      'jsx',
      'py',
      'rs',
      'go',
      'java',
      'rb',
      'php',
      'c',
      'cpp',
      'swift',
      'vue',
      'svelte',
      'astro',
      'mdx',
      'cs',
      'sass',
      'proto',
      'ps1',
      'bat',
      'clj',
      'ex',
      'exs'
    ].includes(ext)
  ) {
    return FileCode
  }
  if (ext === 'json' || ext === 'vue' || ext === 'svelte') return FileJson
  if (['md', 'txt', 'rst', 'log'].includes(ext)) return FileText
  return File
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return (a.name || '').localeCompare(b.name || '')
  })
}

function TreeNode({
  node,
  depth,
  rootPath,
  activeFilePath,
  onFileSelect,
  expandedDirs,
  toggleDir,
  expandedChildren,
  setExpandedChildren,
  loadingDirs
}: {
  node: FileTreeNode
  depth: number
  rootPath: string
  activeFilePath?: string
  onFileSelect: (path: string, name: string) => void
  expandedDirs: Set<string>
  toggleDir: (path: string) => void
  expandedChildren: Record<string, FileTreeNode[]>
  setExpandedChildren: React.Dispatch<React.SetStateAction<Record<string, FileTreeNode[]>>>
  loadingDirs: Set<string>
}) {
  const isDir = node.type === 'dir'
  const isExpanded = expandedDirs.has(node.path)
  const isActive = !isDir && node.path === activeFilePath
  const FileIcon = isDir ? (isExpanded ? FolderOpen : Folder) : getFileIcon(node.name)

  const children = expandedChildren[node.path] ?? node.children
  const sortedChildren = children ? sortNodes(children) : []

  return (
    <>
      <button
        onClick={() => {
          if (isDir) {
            toggleDir(node.path)
          } else {
            onFileSelect(node.path, node.name)
          }
        }}
        className={cn(
          'flex items-center gap-1.5 w-full text-left text-[13px] font-mono py-1 pr-2 rounded-md transition-colors',
          isActive
            ? 'bg-primary/10 text-primary'
            : 'text-text-secondary hover:text-text hover:bg-elevated'
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
        title={node.path}
      >
        {isDir &&
          (isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0 text-text-muted" />
          ))}
        {!isDir && <span className="w-3.5 shrink-0" />}
        <FileIcon
          className={cn('w-3.5 h-3.5 shrink-0', isDir ? 'text-amber-500' : 'text-text-muted')}
        />
        <span className="truncate min-w-0">{node.name}</span>
        {isDir && loadingDirs.has(node.path) && (
          <Loader2 className="w-3 h-3 animate-spin text-text-muted ml-auto shrink-0" />
        )}
      </button>
      {isDir &&
        isExpanded &&
        sortedChildren.map((child) => (
          <TreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            rootPath={rootPath}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            expandedChildren={expandedChildren}
            setExpandedChildren={setExpandedChildren}
            loadingDirs={loadingDirs}
          />
        ))}
    </>
  )
}

export default function FileExplorer({
  rootPath,
  tree,
  onFileSelect,
  onRefresh,
  onChangeFolder,
  onSearch,
  activeFilePath
}: FileExplorerProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['.']))
  const [expandedChildren, setExpandedChildren] = useState<Record<string, FileTreeNode[]>>({})
  const [loadingDirs, setLoadingDirs] = useState<Set<string>>(new Set())

  const projectName = rootPath.split('/').pop() ?? rootPath

  const toggleDir = useCallback(
    async (dirPath: string) => {
      setExpandedDirs((prev) => {
        const next = new Set(prev)
        if (next.has(dirPath)) {
          next.delete(dirPath)
        } else {
          next.add(dirPath)
        }
        return next
      })

      // Lazy-load children if not already loaded
      if (!expandedDirs.has(dirPath) && !expandedChildren[dirPath]) {
        setLoadingDirs((prev) => new Set(prev).add(dirPath))
        try {
          const children = await window.dexterai.fs.readDirShallow({
            dirPath,
            rootPath
          })
          setExpandedChildren((prev) => ({ ...prev, [dirPath]: children }))
        } catch (e) {
          console.error('Failed to load directory:', e)
        } finally {
          setLoadingDirs((prev) => {
            const next = new Set(prev)
            next.delete(dirPath)
            return next
          })
        }
      }
    },
    [rootPath, expandedDirs, expandedChildren]
  )

  const sorted = sortNodes(tree || [])

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-border-subtle min-w-[200px] overflow-hidden">
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-3.5 py-3.5 border-b border-border/40 shrink-0 bg-[#121212]">
        <div className="flex-1 min-w-0 mr-3 flex items-center gap-2.5">
          <FolderOpenIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[12px] font-bold text-text uppercase tracking-widest truncate min-w-0 flex-1">
            {projectName}
          </span>
        </div>
        <div className="flex flex-row items-center gap-1.5 shrink-0 ml-auto">
          {onSearch && (
            <button
              onClick={onSearch}
              className="p-1 px-1.5 rounded hover:bg-white/5 transition-colors"
              title="Search in files (⇧⌘F)"
            >
              <Search className="w-3.5 h-3.5 text-text-muted hover:text-text" />
            </button>
          )}
          <button
            onClick={onRefresh}
            className="p-1 rounded hover:bg-elevated transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
          </button>
          <button
            onClick={onChangeFolder}
            className="p-1 rounded hover:bg-elevated transition-colors"
            title="Change folder"
          >
            <FolderOpenIcon className="w-3.5 h-3.5 text-text-muted" />
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
        {tree.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8 text-text-muted opacity-50">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <p className="text-[10px]">Loading files...</p>
          </div>
        )}
        {sorted.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            rootPath={rootPath}
            activeFilePath={activeFilePath}
            onFileSelect={onFileSelect}
            expandedDirs={expandedDirs}
            toggleDir={toggleDir}
            expandedChildren={expandedChildren}
            setExpandedChildren={setExpandedChildren}
            loadingDirs={loadingDirs}
          />
        ))}
      </div>
    </div>
  )
}
