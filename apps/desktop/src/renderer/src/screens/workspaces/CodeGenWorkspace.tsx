import { useState, useTransition, useEffect, useRef } from 'react'
import {
  Play,
  StopCircle,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronRight,
  Code
} from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import Editor, { DiffEditor } from '@monaco-editor/react'
import TemplateManager from '../../components/TemplateManager'

export default function CodeGenWorkspace({
  providerId,
  modelId
}: {
  providerId: string
  modelId: string
}) {
  const [taskDescription, setTaskDescription] = useState('')
  const [language, setLanguage] = useState('typescript')
  const [contextCode, setContextCode] = useState('')
  const [outputCode, setOutputCode] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)
  const [showContext, setShowContext] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const endOfOutputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endOfOutputRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [outputCode])

  useEffect(() => {
    const unsubChunk = window.dexterai.on('test:chunk', (data) => {
      if (data.requestId !== requestIdRef.current) return
      startTransition(() => setOutputCode((prev) => prev + (data.text ?? '')))
    })

    const unsubDone = window.dexterai.on('test:done', (data) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        setIsStreaming(false)
      }
    })

    const unsubError = window.dexterai.on('test:error', (data) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        setIsStreaming(false)
        setOutputCode((prev) => prev + `\n\n// Error: ${data.message}`)
      }
    })

    return () => {
      unsubChunk()
      unsubDone()
      unsubError()
    }
  }, [])

  const handleRun = async () => {
    if (!taskDescription.trim() || isStreaming) return
    setOutputCode('')
    setIsStreaming(true)
    const reqId = `req_${Date.now()}`
    requestIdRef.current = reqId
    const prompt = `Language: ${language}\nTask: ${taskDescription}${contextCode ? `\nContext:\n${contextCode}` : ''}`
    try {
      await window.dexterai.provider.test({
        requestId: reqId,
        modelId,
        providerId,
        category: 'code_generation',
        params: { messages: [{ role: 'user', content: prompt }], temperature: 0.2, maxTokens: 4096 }
      })
    } catch (e: any) {
      requestIdRef.current = null
      setIsStreaming(false)
      setOutputCode(`// Error starting stream: ${e.message}`)
    }
  }

  const handleStop = async () => {
    if (requestIdRef.current) {
      await window.dexterai.provider.cancelTest(requestIdRef.current)
      requestIdRef.current = null
      setIsStreaming(false)
    }
  }

  const copyToClipboard = () => {
    if (outputCode) {
      navigator.clipboard.writeText(outputCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getCurrentParams = () => ({ taskDescription, language, contextCode })
  const handleLoadTemplate = (params: any) => {
    if (params.taskDescription !== undefined) setTaskDescription(params.taskDescription)
    if (params.language !== undefined) setLanguage(params.language)
    if (params.contextCode !== undefined) setContextCode(params.contextCode)
  }

  return (
    <div className="flex bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[560px]">
      {/* Left: Inputs */}
      <div className="w-1/2 flex flex-col border-r border-border shrink-0 bg-background overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold flex items-center">
            <Code className="w-4 h-4 mr-2" /> Code Generation
          </h3>
          <span className="text-xs text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
            via {providerId}
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col space-y-4">
          <TemplateManager
            category="code_generation"
            onLoadTemplate={handleLoadTemplate}
            getCurrentParams={getCurrentParams}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="sql">SQL</option>
              <option value="html">HTML/CSS</option>
            </select>
          </div>

          <div className="space-y-1 flex-1 flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Task Description
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="E.g. Write a function to reverse a linked list…"
              className="flex-1 min-h-[120px] border border-border rounded-lg p-3 bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm"
              disabled={isStreaming}
            />
          </div>

          <div>
            <button
              onClick={() => setShowContext(!showContext)}
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center hover:text-text transition-colors w-full text-left"
            >
              {showContext ? (
                <ChevronDown className="w-3 h-3 mr-1" />
              ) : (
                <ChevronRight className="w-3 h-3 mr-1" />
              )}
              Context Code (Optional)
            </button>
            {showContext && (
              <textarea
                value={contextCode}
                onChange={(e) => setContextCode(e.target.value)}
                placeholder="Paste existing code or type definitions here…"
                className="w-full h-[160px] mt-2 border border-border rounded-lg p-3 bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
              />
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-surface shrink-0">
          {isStreaming ? (
            <button
              onClick={handleStop}
              className="w-full h-10 flex items-center justify-center border border-red-500/20 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium text-sm"
            >
              <StopCircle className="w-4 h-4 mr-2 fill-current" /> Stop Generation
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!taskDescription.trim()}
              className="w-full h-10 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 font-medium text-sm"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Generate Code
            </button>
          )}
        </div>
      </div>

      {/* Right: Output */}
      <div className="w-1/2 flex flex-col flex-1 bg-black/5 dark:bg-white/5 relative">
        <div className="flex items-center justify-between p-2 absolute top-0 right-0 left-0 z-10 pointer-events-none">
          <div className="pointer-events-auto">
            {contextCode.trim() && outputCode && (
              <div className="flex bg-surface border border-border rounded-md overflow-hidden shadow-sm">
                <button
                  onClick={() => setShowDiff(false)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors',
                    !showDiff
                      ? 'bg-black/5 dark:bg-white/5 text-text'
                      : 'text-gray-500 hover:text-text'
                  )}
                >
                  Code
                </button>
                <button
                  onClick={() => setShowDiff(true)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-colors border-l border-border',
                    showDiff
                      ? 'bg-black/5 dark:bg-white/5 text-text'
                      : 'text-gray-500 hover:text-text'
                  )}
                >
                  Diff
                </button>
              </div>
            )}
          </div>
          <button
            onClick={copyToClipboard}
            className={cn(
              'p-1.5 rounded-md flex items-center text-xs font-medium backdrop-blur-md shadow-sm border transition-colors pointer-events-auto',
              copied
                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                : 'bg-surface/80 text-gray-500 border-border hover:text-text hover:bg-surface'
            )}
          >
            {copied ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        <div className="flex-1 p-4 pt-12 flex flex-col h-full">
          {outputCode ? (
            showDiff && contextCode.trim() ? (
              <div className="flex-1 min-h-[400px] border border-border rounded-md overflow-hidden bg-[#1e1e1e]">
                <DiffEditor
                  height="100%"
                  original={contextCode}
                  modified={outputCode}
                  language={language}
                  theme="vs-dark"
                  options={{ readOnly: true, minimap: { enabled: false } }}
                  loading={
                    <div className="flex items-center justify-center h-full text-xs text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading Diff…
                    </div>
                  }
                />
              </div>
            ) : (
              <div className="flex-1 min-h-[400px] border border-border rounded-md overflow-hidden bg-[#1e1e1e]">
                <Editor
                  height="100%"
                  value={outputCode}
                  language={language}
                  theme="vs-dark"
                  options={{ readOnly: true, minimap: { enabled: false }, wordWrap: 'on' }}
                  loading={
                    <div className="flex items-center justify-center h-full text-xs text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading…
                    </div>
                  }
                />
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {isStreaming ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
              {isStreaming ? 'Generating…' : 'Generated code will appear here.'}
            </div>
          )}
          <div ref={endOfOutputRef} />
        </div>
      </div>
    </div>
  )
}
