import { ipcMain } from 'electron'
import type * as ptyTypes from 'node-pty'
import { platform } from 'os'

let pty: typeof ptyTypes | null = null
try {
  pty = require('node-pty')
} catch (e) {
  console.warn('node-pty failed to load — terminal feature disabled:', (e as Error).message)
}

const ActiveTerminals = new Map<string, ptyTypes.IPty>()

export function registerTerminalHandlers() {
  ipcMain.handle('terminal:create', async (event, args: { id: string; cwd: string; shell?: string }) => {
    if (!pty) {
      return { id: args.id, error: 'node-pty is not available. Please rebuild native modules for Electron.' }
    }
    try {
      const shell = args.shell || (platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh')
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: args.cwd,
        env: process.env as Record<string, string>
      })
      ActiveTerminals.set(args.id, ptyProcess)
      ptyProcess.onData((data) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal:data', { id: args.id, data })
        }
      })
      ptyProcess.onExit(({ exitCode }) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal:exit', { id: args.id, exitCode })
        }
        ActiveTerminals.delete(args.id)
      })
      return { id: args.id }
    } catch (e) {
      return { id: args.id, error: (e as Error).message }
    }
  })

  ipcMain.on('terminal:write', (_, args: { id: string; data: string }) => {
    ActiveTerminals.get(args.id)?.write(args.data)
  })

  ipcMain.on('terminal:resize', (_, args: { id: string; cols: number; rows: number }) => {
    ActiveTerminals.get(args.id)?.resize(args.cols, args.rows)
  })

  ipcMain.handle('terminal:dispose', async (_, args: { id: string }) => {
    const term = ActiveTerminals.get(args.id)
    if (term) { term.kill(); ActiveTerminals.delete(args.id) }
  })
}

export function disposeAllTerminals() {
  for (const [id, term] of ActiveTerminals) {
    term.kill()
    ActiveTerminals.delete(id)
  }
}
