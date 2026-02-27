import { useEffect, useRef } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Terminal } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'

interface TerminalPanelProps {
  rootPath: string
}

export default function TerminalPanel({ rootPath }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const termIdRef = useRef<string>('')

  useEffect(() => {
    if (!containerRef.current) return

    const termId = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    termIdRef.current = termId

    const term = new XTerm({
      fontFamily: 'JetBrains Mono, SF Mono, Menlo, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      cursorStyle: 'bar',
      theme: {
        background: '#1a1b26',
        foreground: '#a9b1d6',
        cursor: '#c0caf5',
        selectionBackground: '#33467c',
        black: '#15161e',
        red: '#f7768e',
        green: '#9ece6a',
        yellow: '#e0af68',
        blue: '#7aa2f7',
        magenta: '#bb9af7',
        cyan: '#7dcfff',
        white: '#a9b1d6',
        brightBlack: '#414868',
        brightRed: '#f7768e',
        brightGreen: '#9ece6a',
        brightYellow: '#e0af68',
        brightBlue: '#7aa2f7',
        brightMagenta: '#bb9af7',
        brightCyan: '#7dcfff',
        brightWhite: '#c0caf5'
      }
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    // Fit after open
    requestAnimationFrame(() => fitAddon.fit())

    // Forward user input to pty
    term.onData((data) => {
      window.dexterai.terminal.write({ id: termId, data })
    })

    // Receive pty output
    const unsubData = window.dexterai.on('terminal:data', (payload) => {
      if (payload.id === termId) term.write(payload.data)
    })

    const unsubExit = window.dexterai.on('terminal:exit', (payload) => {
      if (payload.id === termId) {
        term.writeln(`\r\n[Process exited with code ${payload.exitCode}]`)
      }
    })

    // Spawn pty
    window.dexterai.terminal.create({ id: termId, cwd: rootPath }).then((result) => {
      if (result?.error) {
        term.writeln(`\r\n\x1b[31m[Terminal unavailable: ${result.error}]\x1b[0m`)
      }
    })

    // ResizeObserver for auto-fit
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (fitAddonRef.current) {
          fitAddonRef.current.fit()
          const dims = fitAddonRef.current.proposeDimensions()
          if (dims) {
            window.dexterai.terminal.resize({ id: termId, cols: dims.cols, rows: dims.rows })
          }
        }
      })
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      unsubData()
      unsubExit()
      term.dispose()
      window.dexterai.terminal.dispose({ id: termId })
    }
  }, [rootPath])

  return (
    <div className="flex flex-col h-full bg-[#1a1b26]">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface/50 border-b border-border text-xs text-text-muted">
        <Terminal className="w-3.5 h-3.5" />
        <span className="font-medium">Terminal</span>
      </div>
      <div ref={containerRef} className="flex-1 min-h-0 px-1" />
    </div>
  )
}
