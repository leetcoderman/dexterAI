import { useState, useEffect, useRef } from 'react'
import { Play, StopCircle, Volume2, Copy, Check, Download, Loader2 } from 'lucide-react'

export default function TTSWorkspace({
  providerId,
  modelId
}: {
  providerId: string
  modelId: string
}) {
  const [text, setText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [audioPath, setAudioPath] = useState<string | null>(null)
  const [charCount, setCharCount] = useState(0)
  const [sizeBytes, setSizeBytes] = useState(0)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const unsubDone = window.dexterai.on('test:done', (data: any) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        setIsGenerating(false)
        if (data.result?.audioPath) {
          setAudioPath(data.result.audioPath)
          setCharCount(data.result.charCount ?? 0)
          setSizeBytes(data.result.sizeBytes ?? 0)
        }
      }
    })

    const unsubError = window.dexterai.on('test:error', (data) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        setIsGenerating(false)
        setErrorMsg(data.message)
      }
    })

    return () => {
      unsubDone()
      unsubError()
    }
  }, [])

  const handleGenerate = async () => {
    if (!text.trim() || isGenerating) return
    setIsGenerating(true)
    setErrorMsg('')
    setAudioPath(null)
    const reqId = `req_${Date.now()}`
    requestIdRef.current = reqId
    try {
      await window.dexterai.provider.test({
        requestId: reqId,
        modelId,
        providerId,
        category: 'text_to_speech',
        params: { text: text.trim() }
      })
    } catch (e: any) {
      requestIdRef.current = null
      setIsGenerating(false)
      setErrorMsg(e.message)
    }
  }

  const handleStop = async () => {
    if (requestIdRef.current) {
      await window.dexterai.provider.cancelTest(requestIdRef.current)
      requestIdRef.current = null
      setIsGenerating(false)
    }
  }

  const copyText = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="flex bg-surface border border-border-subtle rounded-xl overflow-hidden min-h-[500px]">
      {/* Left: Input */}
      <div className="w-[45%] flex flex-col border-r border-border-subtle shrink-0">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-text">
            <Volume2 className="w-4 h-4 text-primary" /> Text to Speech
          </h3>
          <span className="text-[10px] text-text-muted bg-elevated px-2 py-1 rounded-full font-medium">
            {modelId}
          </span>
        </div>

        <div className="flex-1 flex flex-col p-4 gap-4">
          {/* Text input */}
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Input Text
              </label>
              <span className="text-[10px] text-text-muted">{text.length} chars</span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="flex-1 w-full bg-elevated border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary/50 resize-none transition-colors"
            />
          </div>

          {/* Copy button */}
          {text.length > 0 && (
            <button
              onClick={copyText}
              className="btn-ghost text-xs flex items-center gap-1.5 self-start"
            >
              {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy text'}
            </button>
          )}
        </div>

        {/* Action button */}
        <div className="p-4 border-t border-border-subtle shrink-0">
          {errorMsg && <p className="text-xs text-danger mb-3">{errorMsg}</p>}
          {isGenerating ? (
            <button
              onClick={handleStop}
              className="btn-danger w-full flex items-center justify-center gap-2 text-sm"
            >
              <StopCircle className="w-4 h-4" /> Stop
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={!text.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Generate Speech
            </button>
          )}
        </div>
      </div>

      {/* Right: Output */}
      <div className="w-[55%] flex flex-col flex-1 bg-background p-4">
        <div className="flex-1 flex flex-col items-center justify-center">
          {audioPath ? (
            <div className="w-full max-w-md space-y-6 animate-fade-in">
              {/* Audio player */}
              <div className="bg-surface border border-border-subtle rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Volume2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text">Generated Audio</p>
                    <p className="text-[10px] text-text-muted">
                      {charCount} characters &middot; {formatSize(sizeBytes)}
                    </p>
                  </div>
                </div>

                <audio
                  ref={audioRef}
                  controls
                  src={`file://${audioPath}`}
                  className="w-full h-10 rounded-md"
                  autoPlay
                />

                <a
                  href={`file://${audioPath}`}
                  download
                  className="btn-secondary w-full flex items-center justify-center gap-2 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download Audio
                </a>
              </div>

              {/* Re-generate hint */}
              <p className="text-center text-[10px] text-text-muted">
                Edit the text and click Generate Speech to create new audio.
              </p>
            </div>
          ) : isGenerating ? (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-text-muted">Generating speech...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-text-muted">
              <Volume2 className="w-10 h-10 opacity-20" />
              <p className="text-sm">Audio will appear here after generation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
