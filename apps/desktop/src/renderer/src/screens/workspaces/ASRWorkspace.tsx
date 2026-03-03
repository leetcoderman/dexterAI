import { useState, useTransition, useEffect, useRef } from 'react'
import {
  Play,
  StopCircle,
  Mic,
  Upload,
  FileAudio,
  Copy,
  Check,
  Loader2,
  Settings2
} from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import TemplateManager from '../../components/TemplateManager'

export default function ASRWorkspace({
  providerId,
  modelId
}: {
  providerId: string
  modelId: string
}) {
  const [taskType, setTaskType] = useState<'transcribe' | 'translate'>('transcribe')
  const [language, setLanguage] = useState('auto')
  const [audioSource, setAudioSource] = useState<'file' | 'mic'>('file')
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [diarization, setDiarization] = useState(false)
  const [smartFormat, setSmartFormat] = useState(true)
  const [punctuate, setPunctuate] = useState(true)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [transcript, setTranscript] = useState('')
  const [copied, setCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [words, setWords] = useState<Array<{ word: string; start: number; end: number }>>([])
  const audioRef = useRef<HTMLAudioElement>(null)
  const waveformRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<any>(null)
  const transcriptEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = waveformRef.current
    if (audioSource === 'mic' && container) {
      import('wavesurfer.js').then((module) => {
        const WaveSurfer = module.default
        if (!wavesurferRef.current) {
          wavesurferRef.current = WaveSurfer.create({
            container,
            waveColor: '#6366f1',
            progressColor: '#4f46e5',
            cursorWidth: 0,
            height: 60,
            barWidth: 2,
            barGap: 2,
            barRadius: 2
          })
        }
      })
    }
    return () => {
      if (wavesurferRef.current && audioSource !== 'mic') {
        wavesurferRef.current.destroy()
        wavesurferRef.current = null
      }
    }
  }, [audioSource])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    const unsubChunk = window.dexterai.on('test:chunk', (data) => {
      if (data.requestId !== requestIdRef.current) return
      startTransition(() => setTranscript((prev) => prev + (data.text ?? '')))
    })

    const unsubDone = window.dexterai.on('test:done', (data: any) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        startTransition(() => {
          setIsTranscribing(false)
          if (data.result?.text)
            setTranscript((prev) => prev + (prev ? ' ' : '') + data.result.text)
          if (data.result?.words) setWords(data.result.words)
        })
      }
    })

    const unsubError = window.dexterai.on('test:error', (data) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        setIsTranscribing(false)
        setErrorMsg(`Error: ${data.message}`)
      }
    })

    return () => {
      unsubChunk()
      unsubDone()
      unsubError()
    }
  }, [])

  const handleSelectFile = async () => {
    try {
      const file = await window.dexterai.files.openAudioPicker()
      if (file) {
        setSelectedFile(file.path)
        setFileName(file.name)
        setErrorMsg('')
      }
    } catch (e: any) {
      setErrorMsg(`File picker error: ${e.message}`)
    }
  }

  const handleRun = async () => {
    if ((audioSource === 'file' && !selectedFile) || isTranscribing) return
    setIsTranscribing(true)
    setErrorMsg('')
    setTranscript('')
    setWords([])
    const reqId = `req_${Date.now()}`
    requestIdRef.current = reqId
    try {
      await window.dexterai.provider.test({
        requestId: reqId,
        modelId,
        providerId,
        category: 'audio_transcription',
        params: {
          filePath: selectedFile,
          task: taskType,
          language: language === 'auto' ? undefined : language,
          diarize: diarization,
          smartFormat,
          punctuate
        }
      })
    } catch (e: any) {
      requestIdRef.current = null
      setIsTranscribing(false)
      setErrorMsg(`Failed to start transcription: ${e.message}`)
    }
  }

  const handleStop = async () => {
    if (requestIdRef.current) {
      await window.dexterai.provider.cancelTest(requestIdRef.current)
      requestIdRef.current = null
      setIsTranscribing(false)
    }
  }

  const copyToClipboard = () => {
    if (transcript) {
      navigator.clipboard.writeText(transcript)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const exportAsText = () => {
    const blob = new Blob([transcript], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transcript_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCurrentParams = () => ({
    taskType,
    language,
    audioSource,
    diarization,
    smartFormat,
    punctuate
  })
  const handleLoadTemplate = (params: any) => {
    if (params.taskType !== undefined) setTaskType(params.taskType)
    if (params.language !== undefined) setLanguage(params.language)
    if (params.audioSource !== undefined) setAudioSource(params.audioSource)
    if (params.diarization !== undefined) setDiarization(params.diarization)
    if (params.smartFormat !== undefined) setSmartFormat(params.smartFormat)
    if (params.punctuate !== undefined) setPunctuate(params.punctuate)
  }

  return (
    <div className="flex bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[560px]">
      {/* Left: Inputs */}
      <div className="w-[45%] flex flex-col border-r border-border shrink-0 bg-background overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold flex items-center">
            <FileAudio className="w-4 h-4 mr-2" /> Audio Transcription
          </h3>
          <span className="text-xs text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
            via {providerId}
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col space-y-5">
          <TemplateManager
            category="audio_transcription"
            onLoadTemplate={handleLoadTemplate}
            getCurrentParams={getCurrentParams}
          />

          {/* Audio Source Tabs */}
          <div className="flex p-1 bg-black/5 dark:bg-white/5 rounded-lg border border-border">
            <button
              onClick={() => setAudioSource('file')}
              className={cn(
                'flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center',
                audioSource === 'file' ? 'bg-surface shadow-sm' : 'text-gray-500 hover:text-text'
              )}
            >
              <Upload className="w-4 h-4 mr-2" /> File Upload
            </button>
            <button
              onClick={() => setAudioSource('mic')}
              className={cn(
                'flex-1 py-1.5 text-sm font-medium rounded-md transition-all flex items-center justify-center',
                audioSource === 'mic' ? 'bg-surface shadow-sm' : 'text-gray-500 hover:text-text'
              )}
            >
              <Mic className="w-4 h-4 mr-2" /> Live Mic
            </button>
          </div>

          {audioSource === 'file' ? (
            <div
              onClick={handleSelectFile}
              className={cn(
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors',
                selectedFile
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-border hover:border-gray-400 hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              <FileAudio
                className={cn('w-10 h-10 mb-3', selectedFile ? 'text-primary' : 'text-gray-400')}
              />
              {selectedFile ? (
                <div>
                  <p className="font-medium text-sm text-text">{fileName}</p>
                  <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium text-sm text-text mb-1">
                    Click to select an audio file
                  </p>
                  <p className="text-xs text-gray-500">WAV, MP3, M4A, FLAC, OGG, AAC</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center bg-black/5 dark:bg-white/5 relative min-h-[160px]">
              <div
                ref={waveformRef}
                className="w-full h-[60px] opacity-70 absolute inset-x-8 bottom-4 pointer-events-none"
              />
              <Mic className="w-10 h-10 text-gray-400 mb-3 relative z-10" />
              <p className="font-medium text-sm text-text mb-1 relative z-10">Live Microphone</p>
              <p className="text-xs text-gray-500 relative z-10">
                Click Start Transcription to begin recording.
              </p>
            </div>
          )}

          {audioSource === 'file' && selectedFile && (
            <audio
              ref={audioRef}
              controls
              src={`file://${selectedFile}`}
              className="w-full h-10 rounded-md"
            />
          )}

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Task</label>
              <div className="flex bg-black/5 dark:bg-white/5 rounded-md p-0.5 border border-border">
                <button
                  onClick={() => setTaskType('transcribe')}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
                    taskType === 'transcribe' ? 'bg-surface shadow text-text' : 'text-gray-500'
                  )}
                >
                  Transcribe
                </button>
                <button
                  onClick={() => setTaskType('translate')}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
                    taskType === 'translate' ? 'bg-surface shadow text-text' : 'text-gray-500'
                  )}
                >
                  Translate to English
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Source Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                disabled={taskType === 'translate'}
              >
                <option value="auto">Auto-detect</option>
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="hi">Hindi</option>
                <option value="ja">Japanese</option>
              </select>
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center">
                <Settings2 className="w-3 h-3 mr-1" /> Model Features
              </label>
              {[
                {
                  key: 'diarization',
                  label: 'Speaker Diarization',
                  value: diarization,
                  set: setDiarization
                },
                {
                  key: 'smartFormat',
                  label: 'Smart Formatting',
                  value: smartFormat,
                  set: setSmartFormat
                },
                { key: 'punctuate', label: 'Punctuate Output', value: punctuate, set: setPunctuate }
              ].map(({ key, label, value, set }) => (
                <label key={key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => set(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary bg-surface"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-surface shrink-0">
          {errorMsg && <p className="text-sm text-red-500 mb-3">{errorMsg}</p>}
          {isTranscribing ? (
            <button
              onClick={handleStop}
              className="w-full h-10 flex items-center justify-center border border-red-500/20 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium text-sm"
            >
              <StopCircle className="w-4 h-4 mr-2 fill-current" /> Stop
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={audioSource === 'file' && !selectedFile}
              className="w-full h-10 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 font-medium text-sm"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Start Transcription
            </button>
          )}
        </div>
      </div>

      {/* Right: Output */}
      <div className="w-[55%] flex flex-col flex-1 bg-black/5 dark:bg-white/5 relative p-4">
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <button
            onClick={copyToClipboard}
            className={cn(
              'p-2 rounded-md flex items-center text-xs font-medium border transition-colors bg-surface shadow-sm',
              copied
                ? 'text-green-500 border-green-500/20'
                : 'text-gray-500 border-border hover:text-text'
            )}
            title="Copy text"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={exportAsText}
            className="px-3 py-2 text-xs font-medium text-gray-500 border border-border rounded-md bg-surface hover:text-text hover:bg-black/5 transition-colors shadow-sm"
          >
            TXT
          </button>
        </div>

        <div className="w-full h-full bg-surface border border-border rounded-xl shadow-inner p-6 overflow-y-auto pt-14">
          {transcript || words.length > 0 ? (
            <div className="text-text text-sm leading-relaxed whitespace-pre-wrap">
              {words.length > 0 ? (
                <div>
                  {words.map((w, i) => (
                    <span
                      key={i}
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.currentTime = w.start
                          audioRef.current.play()
                        }
                      }}
                      className="cursor-pointer hover:bg-primary/20 hover:text-primary transition-colors rounded-sm px-0.5 mr-1"
                      title={`${w.start.toFixed(2)}s`}
                    >
                      {w.word}
                    </span>
                  ))}
                  {isTranscribing && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
                  )}
                </div>
              ) : (
                <>
                  {transcript}
                  {isTranscribing && (
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
              <FileAudio className="w-12 h-12 opacity-30" />
              <p className="text-sm">
                {isTranscribing ? 'Listening…' : 'Transcript will appear here.'}
              </p>
            </div>
          )}
          <div ref={transcriptEndRef} />
        </div>
      </div>
    </div>
  )
}
