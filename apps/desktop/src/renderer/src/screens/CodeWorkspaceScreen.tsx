import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, ChevronLeft, ChevronRight, TriangleAlert } from 'lucide-react'
import {
  Group as PanelGroup,
  Panel,
  Separator as PanelResizeHandle,
  useDefaultLayout
} from 'react-resizable-panels'
import { useAppStore } from '../store'
import FileExplorer, { detectLanguage } from '../components/code/FileExplorer'
import EditorTabs from '../components/code/EditorTabs'
import CodeChat from '../components/code/CodeChat'
import TerminalPanel from '../components/code/TerminalPanel'
import SearchPanel from '../components/code/SearchPanel'

export default function CodeWorkspaceScreen() {
  const {
    projectRoot,
    setProjectRoot,
    fileTree,
    setFileTree,
    openFiles,
    activeFileIndex,
    openFile,
    closeFile,
    updateFileContent,
    markFileSaved,
    setActiveFileIndex,
    setOpenFiles,
    setCodeConversationId,
    sidebarCollapsed,
    toggleSidebar
  } = useAppStore()

  const [showSearch, setShowSearch] = useState(false)
  const activeFile = openFiles[activeFileIndex] ?? null

  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: 'code-workspace-panels',
    storage: localStorage
  })

  // On mount: reload tree if projectRoot persisted from previous session
  useEffect(() => {
    if (projectRoot) {
      window.dexterai.fs.stat({ filePath: '.', rootPath: projectRoot }).then((result) => {
        if ('error' in result) {
          // Folder no longer exists
          setProjectRoot(null)
          setFileTree([])
        } else {
          loadTree(projectRoot)
        }
      })
    }
  }, [])

  // Auto-collapse primary sidebar when workspace is active
  useEffect(() => {
    if (!sidebarCollapsed) {
      toggleSidebar()
    }
    // No cleanup: we want it collapsed while here.
    // Usually user would expand it manually if they really wanted.
  }, [])

  const loadTree = useCallback(
    async (root: string) => {
      try {
        const tree = await window.dexterai.fs.readDir({ rootPath: root })
        setFileTree(tree)
      } catch (e) {
        console.error('Failed to load file tree:', e)
      }
    },
    [setFileTree]
  )

  const handleOpenFolder = useCallback(async () => {
    const result = await window.dexterai.fs.openFolder()
    if (!result) return

    // Reset workspace state
    setOpenFiles([])
    setActiveFileIndex(-1)
    setCodeConversationId(null)
    setProjectRoot(result.rootPath)
    await loadTree(result.rootPath)
  }, [setProjectRoot, setOpenFiles, setActiveFileIndex, setCodeConversationId, loadTree])

  const handleFileSelect = useCallback(
    async (filePath: string, fileName: string) => {
      if (!projectRoot) return

      // Check if already open
      const existing = openFiles.findIndex((f) => f.path === filePath)
      if (existing !== -1) {
        setActiveFileIndex(existing)
        return
      }

      // Read from disk
      const result = await window.dexterai.fs.readFile({ filePath, rootPath: projectRoot })
      if ('error' in result) {
        console.error('Failed to read file:', result.error)
        return
      }

      const language = detectLanguage(fileName)
      openFile(filePath, fileName, result.content, language)
    },
    [projectRoot, openFiles, setActiveFileIndex, openFile]
  )

  const handleSave = useCallback(
    async (index: number) => {
      if (!projectRoot) return
      const file = openFiles[index]
      if (!file) return

      const result = await window.dexterai.fs.writeFile({
        filePath: file.path,
        rootPath: projectRoot,
        content: file.content
      })
      if (result.success) {
        markFileSaved(index)
      } else {
        console.error('Failed to save file:', result.error)
      }
    },
    [projectRoot, openFiles, markFileSaved]
  )

  const handleRefresh = useCallback(() => {
    if (projectRoot) loadTree(projectRoot)
  }, [projectRoot, loadTree])

  // Cmd+Shift+F → toggle search panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault()
        setShowSearch((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Landing state
  if (!projectRoot) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-6 max-w-md text-center">
          <div className="w-20 h-20 flex items-center justify-center bg-primary/10 rounded-2xl">
            <FolderOpen className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-text mb-2">Open a Project</h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Select a folder to open a code workspace with a file explorer, editor, and AI chat
              assistant.
            </p>
          </div>
          <button
            onClick={handleOpenFolder}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors shadow-sm"
          >
            Open Folder
          </button>
        </div>
      </div>
    )
  }

  // 3-panel workspace
  return (
    <div className="flex flex-col h-full bg-background no-select overflow-hidden">
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-center gap-2 shrink-0">
        <TriangleAlert className="w-4 h-4 text-amber-600 dark:text-amber-500" />
        <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
          EXPERIMENTAL FEATURE: The Code workspace is currently under development, is highly
          untested and may showcase various errors.
        </span>
      </div>
      <PanelGroup
        orientation="horizontal"
        className="flex-1"
        defaultLayout={defaultLayout}
        onLayoutChanged={onLayoutChanged}
      >
        {/* File Explorer / Search */}
        <Panel defaultSize={360} minSize={25} maxSize={365} className="flex flex-col">
          {showSearch ? (
            <SearchPanel
              rootPath={projectRoot}
              onResultClick={handleFileSelect}
              onClose={() => setShowSearch(false)}
            />
          ) : (
            <FileExplorer
              rootPath={projectRoot}
              tree={fileTree}
              onFileSelect={handleFileSelect}
              onRefresh={handleRefresh}
              onChangeFolder={handleOpenFolder}
              activeFilePath={activeFile?.path}
              onSearch={() => setShowSearch(true)}
            />
          )}
        </Panel>

        <PanelResizeHandle className="w-1.5 relative group bg-border/5 transition-all hover:bg-primary/20 flex items-center justify-center cursor-col-resize">
          <div className="absolute left-1/2 -translate-x-1/2 w-[1px] h-full bg-border group-hover:bg-primary/50 transition-colors" />
          <div className="z-10 bg-surface border border-border shadow-glow rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all text-text-muted">
            <ChevronLeft className="w-3 h-3" />
          </div>
        </PanelResizeHandle>

        {/* Editor + Terminal */}
        <Panel defaultSize={55} minSize={30}>
          <PanelGroup orientation="vertical">
            <Panel defaultSize={70} minSize={20}>
              <EditorTabs
                files={openFiles}
                activeIndex={activeFileIndex}
                onTabSelect={setActiveFileIndex}
                onTabClose={closeFile}
                onContentChange={updateFileContent}
                onSave={handleSave}
              />
            </Panel>
            <PanelResizeHandle className="h-1 bg-border-subtle hover:bg-primary/50 transition-colors cursor-row-resize" />
            <Panel defaultSize={30} minSize={10} collapsible={true}>
              <TerminalPanel rootPath={projectRoot} />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="w-1.5 relative group bg-border/5 transition-all hover:bg-primary/20 flex items-center justify-center cursor-col-resize">
          <div className="absolute left-1/2 -translate-x-1/2 w-[1px] h-full bg-border group-hover:bg-primary/50 transition-colors" />
          <div className="z-10 bg-surface border border-border shadow-glow rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all text-text-muted">
            <ChevronRight className="w-3 h-3" />
          </div>
        </PanelResizeHandle>

        {/* Chat */}
        <Panel defaultSize={25} minSize={15} className="flex flex-col">
          <CodeChat
            rootPath={projectRoot}
            activeFile={activeFile}
            openFiles={openFiles}
            fileTree={fileTree}
          />
        </Panel>
      </PanelGroup>
    </div>
  )
}
