import { useState, useTransition, useEffect, useRef } from 'react'
import {
  Play,
  StopCircle,
  Image as ImageIcon,
  Download,
  Loader2,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@dexterai/shared-utils'
import TemplateManager from '../../components/TemplateManager'

interface ImageHistoryItem {
  id: string
  url: string
  prompt: string
  params: any
}

export default function ImageGenWorkspace({
  providerId,
  modelId
}: {
  providerId: string
  modelId: string
}) {
  const [prompt, setPrompt] = useState('')
  const [negativePrompt, setNegativePrompt] = useState('')
  const [width, setWidth] = useState(1024)
  const [height, setHeight] = useState(1024)
  const [aspectRatio, setAspectRatio] = useState('1:1')
  const [stylePreset, setStylePreset] = useState('')
  const [steps, setSteps] = useState(30)
  const [guidanceScale, setGuidanceScale] = useState(7.5)
  const [seed, setSeed] = useState<number | ''>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const requestIdRef = useRef<string | null>(null)
  const requestParamsRef = useRef<any>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [currentImage, setCurrentImage] = useState<string | null>(null)
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [isPending, startTransition] = useTransition()

  const applyAspectRatio = (ratio: string, baseWidth: number) => {
    if (ratio === '16:9') return Math.round((baseWidth * 9) / 16)
    if (ratio === '4:3') return Math.round((baseWidth * 3) / 4)
    if (ratio === '3:4') return Math.round((baseWidth * 4) / 3)
    if (ratio === '9:16') return Math.round((baseWidth * 16) / 9)
    return baseWidth // 1:1 or custom
  }

  const handleAspectRatioChange = (ratio: string) => {
    setAspectRatio(ratio)
    if (ratio !== 'custom') setHeight(applyAspectRatio(ratio, width))
  }

  const handleWidthChange = (w: number) => {
    setWidth(w)
    if (aspectRatio !== 'custom') setHeight(applyAspectRatio(aspectRatio, w))
  }

  useEffect(() => {
    const unsubDone = window.dexterai.on('test:done', (data: any) => {
      if (data.requestId === requestIdRef.current) {
        const params = requestParamsRef.current
        requestIdRef.current = null
        requestParamsRef.current = null
        startTransition(() => {
          setIsGenerating(false)
          if (data.result?.imageUrl) {
            setCurrentImage(data.result.imageUrl)
            setImageHistory((prev) =>
              [
                {
                  id: Date.now().toString(),
                  url: data.result.imageUrl,
                  prompt: params?.prompt ?? '',
                  params: {
                    width: params?.width,
                    height: params?.height,
                    steps: params?.steps,
                    guidanceScale: params?.guidanceScale,
                    seed: params?.seed
                  }
                },
                ...prev
              ].slice(0, 5)
            )
          }
        })
      }
    })

    const unsubError = window.dexterai.on('test:error', (data) => {
      if (data.requestId === requestIdRef.current) {
        requestIdRef.current = null
        requestParamsRef.current = null
        setIsGenerating(false)
        setErrorMsg(`Error: ${data.message}`)
      }
    })

    return () => {
      unsubDone()
      unsubError()
    }
  }, [])

  const handleRun = async () => {
    if (!prompt.trim() || isGenerating) return
    setIsGenerating(true)
    setErrorMsg('')
    const reqId = `req_${Date.now()}`
    requestIdRef.current = reqId
    requestParamsRef.current = { prompt, width, height, steps, guidanceScale, seed }
    try {
      await window.dexterai.provider.test({
        requestId: reqId,
        modelId,
        providerId,
        category: 'image_generation',
        params: {
          prompt,
          negativePrompt,
          width,
          height,
          steps,
          guidanceScale,
          stylePreset: stylePreset || undefined,
          seed: seed === '' ? Math.floor(Math.random() * 1000000) : seed
        }
      })
    } catch (e: any) {
      requestIdRef.current = null
      requestParamsRef.current = null
      setIsGenerating(false)
      setErrorMsg(`Failed to start generation: ${e.message}`)
    }
  }

  const handleStop = async () => {
    if (requestIdRef.current) {
      await window.dexterai.provider.cancelTest(requestIdRef.current)
      requestIdRef.current = null
      requestParamsRef.current = null
      setIsGenerating(false)
    }
  }

  const handleRestoreHistory = (item: ImageHistoryItem) => {
    setPrompt(item.prompt)
    setWidth(item.params.width)
    setHeight(item.params.height)
    setSteps(item.params.steps)
    setGuidanceScale(item.params.guidanceScale)
    if (item.params.seed) setSeed(item.params.seed)
    setCurrentImage(item.url)
  }

  const getCurrentParams = () => ({
    prompt,
    negativePrompt,
    width,
    height,
    aspectRatio,
    stylePreset,
    steps,
    guidanceScale,
    seed
  })
  const handleLoadTemplate = (params: any) => {
    if (params.prompt !== undefined) setPrompt(params.prompt)
    if (params.negativePrompt !== undefined) setNegativePrompt(params.negativePrompt)
    if (params.width !== undefined) setWidth(params.width)
    if (params.height !== undefined) setHeight(params.height)
    if (params.aspectRatio !== undefined) setAspectRatio(params.aspectRatio)
    if (params.stylePreset !== undefined) setStylePreset(params.stylePreset)
    if (params.steps !== undefined) setSteps(params.steps)
    if (params.guidanceScale !== undefined) setGuidanceScale(params.guidanceScale)
    if (params.seed !== undefined) setSeed(params.seed)
  }

  return (
    <div className="flex bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[560px]">
      {/* Left: Inputs */}
      <div className="w-[45%] flex flex-col border-r border-border shrink-0 bg-background overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h3 className="font-semibold flex items-center">
            <ImageIcon className="w-4 h-4 mr-2" /> Image Generation
          </h3>
          <span className="text-xs text-gray-400 bg-black/5 dark:bg-white/5 px-2 py-1 rounded">
            via {providerId}
          </span>
        </div>

        <div className="p-4 flex-1 flex flex-col space-y-4">
          <TemplateManager
            category="image_generation"
            onLoadTemplate={handleLoadTemplate}
            getCurrentParams={getCurrentParams}
          />

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate…"
              className="w-full min-h-[120px] border border-border rounded-lg p-3 bg-surface resize-none focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm"
              disabled={isGenerating}
            />
          </div>

          <div>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center hover:text-text transition-colors w-full text-left"
            >
              {showAdvanced ? (
                <ChevronDown className="w-3 h-3 mr-1" />
              ) : (
                <ChevronRight className="w-3 h-3 mr-1" />
              )}
              Advanced Parameters
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-4 p-4 border border-border bg-surface rounded-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Negative Prompt
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="Things to avoid…"
                    className="w-full min-h-[60px] border border-border rounded-lg p-3 bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">Aspect Ratio</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => handleAspectRatioChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-border rounded-md text-sm bg-background"
                  >
                    <option value="custom">Custom</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="16:9">16:9 Widescreen</option>
                    <option value="9:16">9:16 Portrait</option>
                    <option value="4:3">4:3 Standard</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 flex justify-between">
                      Width <span>{width}px</span>
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="2048"
                      step="64"
                      value={width}
                      onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 flex justify-between">
                      Height <span>{height}px</span>
                    </label>
                    <input
                      type="range"
                      min="256"
                      max="2048"
                      step="64"
                      value={height}
                      onChange={(e) => {
                        setHeight(parseInt(e.target.value))
                        setAspectRatio('custom')
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 flex justify-between">
                      Steps <span>{steps}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 flex justify-between">
                      CFG Scale <span>{guidanceScale}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Style Preset</label>
                    <select
                      value={stylePreset}
                      onChange={(e) => setStylePreset(e.target.value)}
                      className="w-full px-3 py-1.5 border border-border rounded-md text-sm bg-background mt-1"
                    >
                      <option value="">None</option>
                      <option value="photographic">Photographic</option>
                      <option value="digital-art">Digital Art</option>
                      <option value="anime">Anime</option>
                      <option value="cinematic">Cinematic</option>
                      <option value="3d-model">3D Model</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Seed</label>
                    <div className="flex space-x-2 mt-1">
                      <input
                        type="number"
                        placeholder="Random"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : '')}
                        className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm bg-background min-w-0"
                      />
                      <button
                        onClick={() => setSeed(Math.floor(Math.random() * 1000000))}
                        className="px-3 py-1.5 border border-border rounded-md text-sm bg-background hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0"
                      >
                        🎲
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-border bg-surface shrink-0">
          {errorMsg && <p className="text-sm text-red-500 mb-3">{errorMsg}</p>}
          {isGenerating ? (
            <button
              onClick={handleStop}
              className="w-full h-10 flex items-center justify-center border border-red-500/20 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors font-medium text-sm"
            >
              <StopCircle className="w-4 h-4 mr-2 fill-current" /> Stop Generation
            </button>
          ) : (
            <button
              onClick={handleRun}
              disabled={!prompt.trim()}
              className="w-full h-10 flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 font-medium text-sm"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Generate Image
            </button>
          )}
        </div>
      </div>

      {/* Right: Output */}
      <div className="w-[55%] flex flex-col flex-1 bg-black/5 dark:bg-white/5 relative items-center justify-center p-6 overflow-hidden">
        {currentImage ? (
          <div className="relative group w-full h-full flex flex-col items-center justify-center">
            <img
              src={currentImage}
              alt="Generated"
              className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
            />
            <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={currentImage}
                download="dexterai_gen.png"
                className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-md backdrop-blur-md transition-colors"
                title="Download Image"
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-dashed border-gray-500/30">
              {isGenerating ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <ImageIcon className="w-8 h-8 opacity-30" />
              )}
            </div>
            <p className="text-sm">
              {isGenerating ? 'Generating image…' : 'Generated images will appear here.'}
            </p>
          </div>
        )}

        {imageHistory.length > 0 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface/80 backdrop-blur-md border border-border rounded-xl p-2 flex space-x-2 overflow-x-auto shadow-xl z-20 max-w-[90%]">
            {imageHistory.map((item) => (
              <button
                key={item.id}
                onClick={() => handleRestoreHistory(item)}
                className={cn(
                  'relative w-14 h-14 shrink-0 rounded-lg overflow-hidden border-2 transition-all hover:opacity-100',
                  currentImage === item.url
                    ? 'border-primary ring-2 ring-primary/20 opacity-100'
                    : 'border-transparent opacity-60'
                )}
              >
                <img src={item.url} className="w-full h-full object-cover" alt="History" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
