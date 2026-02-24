import { useState, useTransition, useEffect, useRef } from 'react';
import { Play, StopCircle, Settings2, RefreshCcw, Copy, Check, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@dexterai/shared-utils';
import Editor from '@monaco-editor/react';
import TemplateManager from '../../components/TemplateManager';

interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export default function TextGenWorkspace({ providerId, modelId }: { providerId: string, modelId: string }) {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'system', content: 'You are a helpful AI assistant.' }
    ]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const requestIdRef = useRef<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [copied, setCopied] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(2048);
    const [stopSequences, setStopSequences] = useState('');
    const [jsonMode, setJsonMode] = useState(false);
    const [responseFormat, setResponseFormat] = useState('text');
    const [toolsJson, setToolsJson] = useState('[\n  \n]');

    const endOfMessagesRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isPending]);

    useEffect(() => {
        const unsubChunk = window.dexterai.on('test:chunk', (data) => {
            if (data.requestId !== requestIdRef.current) return;
            startTransition(() => {
                setMessages(prev => {
                    const next = [...prev];
                    const last = next[next.length - 1];
                    if (last && last.role === 'assistant') {
                        next[next.length - 1] = { ...last, content: last.content + (data.text ?? '') };
                    } else {
                        next.push({ role: 'assistant', content: data.text ?? '' });
                    }
                    return next;
                });
            });
        });

        const unsubDone = window.dexterai.on('test:done', (data) => {
            if (data.requestId === requestIdRef.current) {
                requestIdRef.current = null;
                setIsStreaming(false);
            }
        });

        const unsubError = window.dexterai.on('test:error', (data) => {
            if (data.requestId === requestIdRef.current) {
                requestIdRef.current = null;
                setIsStreaming(false);
                setMessages(prev => [...prev, { role: 'assistant', content: `[Error: ${data.message}]` }]);
            }
        });

        return () => { unsubChunk(); unsubDone(); unsubError(); };
    }, []);

    const handleRun = async () => {
        if (!input.trim() || isStreaming) return;

        const newMessages: Message[] = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');
        setIsStreaming(true);

        const reqId = `req_${Date.now()}`;
        requestIdRef.current = reqId;

        try {
            await window.dexterai.provider.test({
                requestId: reqId,
                modelId,
                providerId,
                category: 'text_generation',
                params: {
                    messages: newMessages,
                    temperature,
                    maxTokens,
                    stop: stopSequences ? stopSequences.split(',').map(s => s.trim()).filter(Boolean) : undefined,
                    responseFormat: jsonMode ? { type: 'json_object' } : (responseFormat !== 'text' ? { type: responseFormat } : undefined),
                    tools: (() => {
                        try {
                            const t = JSON.parse(toolsJson);
                            return Array.isArray(t) && t.length > 0 ? t : undefined;
                        } catch { return undefined; }
                    })()
                }
            });
        } catch (e: any) {
            requestIdRef.current = null;
            setIsStreaming(false);
            setMessages(prev => [...prev, { role: 'assistant', content: `[Error starting stream: ${e.message}]` }]);
        }
    };

    const handleStop = async () => {
        if (requestIdRef.current) {
            await window.dexterai.provider.cancelTest(requestIdRef.current);
            requestIdRef.current = null;
            setIsStreaming(false);
        }
    };

    const copyToClipboard = () => {
        const last = messages.filter(m => m.role === 'assistant').pop();
        if (last) {
            navigator.clipboard.writeText(last.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun();
    };

    const getCurrentParams = () => ({
        systemPrompt: messages[0]?.role === 'system' ? messages[0].content : '',
        temperature, maxTokens, stopSequences, jsonMode, responseFormat, toolsJson
    });

    const handleLoadTemplate = (params: any) => {
        if (params.systemPrompt !== undefined) {
            setMessages(prev => {
                const copy = [...prev];
                if (copy[0]?.role === 'system') { copy[0] = { ...copy[0], content: params.systemPrompt }; }
                else { copy.unshift({ role: 'system', content: params.systemPrompt }); }
                return copy;
            });
        }
        if (params.temperature !== undefined) setTemperature(params.temperature);
        if (params.maxTokens !== undefined) setMaxTokens(params.maxTokens);
        if (params.stopSequences !== undefined) setStopSequences(params.stopSequences);
        if (params.jsonMode !== undefined) setJsonMode(params.jsonMode);
        if (params.responseFormat !== undefined) setResponseFormat(params.responseFormat);
        if (params.toolsJson !== undefined) setToolsJson(params.toolsJson);
    };

    return (
        <div className="flex flex-col bg-surface border border-border rounded-xl shadow-sm overflow-hidden min-h-[560px]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 min-h-[200px]">
                {messages.filter(m => m.role !== 'system').length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 space-y-4 py-16">
                        <div className="w-12 h-12 rounded-full border border-dashed border-border flex items-center justify-center">
                            <Settings2 className="w-5 h-5 opacity-50" />
                        </div>
                        <p>Enter a prompt below to start testing <span className="font-medium">{modelId}</span>.</p>
                    </div>
                ) : (
                    messages.map((m, idx) => {
                        if (m.role === 'system') return null;
                        return (
                            <div key={idx} className={cn("flex flex-col max-w-[85%]", m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start")}>
                                <div className={cn("px-4 py-3 rounded-2xl text-sm",
                                    m.role === 'user'
                                        ? "bg-primary text-white rounded-br-sm"
                                        : "bg-black/5 dark:bg-white/5 rounded-bl-sm border border-border text-text whitespace-pre-wrap font-mono")}>
                                    {m.content}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={endOfMessagesRef} />
            </div>

            {/* Action Bar */}
            {messages.filter(m => m.role === 'assistant').length > 0 && !isStreaming && (
                <div className="flex items-center justify-end px-4 py-2 bg-background border-t border-border space-x-2">
                    <button onClick={copyToClipboard} className="p-1.5 text-gray-500 hover:text-text hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors" title="Copy last response">
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={handleRun}
                        disabled={isStreaming}
                        className="p-1.5 text-gray-500 hover:text-text hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                        title="Regenerate"
                    >
                        <RefreshCcw className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input Area */}
            <div className="p-4 bg-background border-t border-border flex flex-col space-y-3 shrink-0">
                <TemplateManager
                    category="text_generation"
                    onLoadTemplate={handleLoadTemplate}
                    getCurrentParams={getCurrentParams}
                />

                <div className="w-full">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center hover:text-text transition-colors mb-2"
                    >
                        {showAdvanced ? <ChevronDown className="w-3 h-3 mr-1" /> : <ChevronRight className="w-3 h-3 mr-1" />}
                        Parameters
                    </button>
                    {showAdvanced && (
                        <div className="p-4 border border-border rounded-lg bg-surface mb-2 space-y-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 flex justify-between">Temperature <span>{temperature}</span></label>
                                    <input type="range" min="0" max="2" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 block">Max Tokens</label>
                                    <input type="number" min="1" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} className="w-full px-2 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500 block">Stop Sequences</label>
                                    <input type="text" placeholder="comma-separated" value={stopSequences} onChange={e => setStopSequences(e.target.value)} className="w-full px-2 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary" />
                                </div>
                                <div className="space-y-2 flex flex-col justify-center">
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" id="jsonMode" checked={jsonMode} onChange={e => setJsonMode(e.target.checked)} className="rounded border-gray-300 text-primary focus:ring-primary" />
                                        <label htmlFor="jsonMode" className="text-xs font-medium text-gray-600">Force JSON Mode</label>
                                    </div>
                                    {!jsonMode && (
                                        <select value={responseFormat} onChange={e => setResponseFormat(e.target.value)} className="w-full px-2 py-1 border border-border rounded text-xs bg-background focus:outline-none">
                                            <option value="text">Text</option>
                                            <option value="json_schema">JSON Schema</option>
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1 border-t border-border pt-4">
                                <label className="text-xs font-medium text-gray-500 block mb-2">Tools Definition (JSON Array)</label>
                                <div className="h-[120px] border border-border rounded-md overflow-hidden">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="json"
                                        theme="vs-dark"
                                        value={toolsJson}
                                        onChange={(val) => setToolsJson(val || '')}
                                        options={{ minimap: { enabled: false }, scrollBeyondLastLine: false, folding: false, lineNumbers: 'off', wordWrap: 'on' }}
                                        loading={<div className="flex items-center justify-center h-full text-xs text-gray-500"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...</div>}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="relative w-full flex items-end space-x-2">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Message dexterAI… (⌘+Enter to send)"
                        className="flex-1 max-h-[200px] min-h-[50px] border border-border rounded-xl p-3 bg-surface resize-y focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-sm text-text"
                        disabled={isStreaming}
                    />
                    {isStreaming ? (
                        <button onClick={handleStop} className="w-12 h-[50px] flex items-center justify-center shrink-0 border border-red-500/20 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors" title="Stop">
                            <StopCircle className="w-5 h-5 fill-current" />
                        </button>
                    ) : (
                        <button onClick={handleRun} disabled={!input.trim()} className="w-12 h-[50px] flex items-center justify-center shrink-0 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50" title="Send">
                            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 ml-1" />}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
