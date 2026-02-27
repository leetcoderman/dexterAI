# Phase 6: Terminal Integration & Agent Command Execution

## Context
Phases 1–5 (complete) built: filesystem backend, 3-panel code workspace, agentic tool system (read/write/search/list), human-in-the-loop diff approval, and polish/persistence. Phase 6 adds an embedded interactive terminal and gives the agent the ability to execute shell commands with approval gating.

## New Dependencies

```bash
pnpm add node-pty @xterm/xterm @xterm/addon-fit @xterm/addon-web-links --filter desktop
```

`node-pty` is a native module — requires rebuild against Electron's Node headers. The existing `postinstall` script (`electron-builder install-app-deps`) should handle this. If it fails: `npx @electron/rebuild -m node_modules/node-pty`.

## Files to Create/Modify

| # | File | Action |
|---|------|--------|
| 1 | `electron.vite.config.ts` | **MODIFY** — externalize `node-pty` in main process rollup config |
| 2 | `electron-builder.yml` | **MODIFY** — `npmRebuild: true`, add `node-pty` to `asarUnpack` |
| 3 | `packages/registry-types/src/index.ts` | **MODIFY** — extend `AgentApprovalRequest` with `approvalType` discriminant |
| 4 | `src/main/tools/tool-definitions.ts` | **MODIFY** — add `execute_command` tool schema |
| 5 | `src/main/tools/tool-executor.ts` | **MODIFY** — add `executeCommandToolFn` using `child_process.exec` |
| 6 | `src/main/ipc/agent.ipc.ts` | **MODIFY** — add `execute_command` to approval set, branch approval payload |
| 7 | `src/main/ipc/terminal.ipc.ts` | **CREATE** — terminal backend with `node-pty` |
| 8 | `src/main/index.ts` | **MODIFY** — register terminal handlers, cleanup on quit |
| 9 | `src/preload/index.ts` | **MODIFY** — add `terminal` namespace + event channels |
| 10 | `src/preload/index.d.ts` | **MODIFY** — mirror type declarations |
| 11 | `src/renderer/src/components/code/TerminalPanel.tsx` | **CREATE** — xterm.js frontend |
| 12 | `src/renderer/src/components/code/CommandApproval.tsx` | **CREATE** — command approval UI |
| 13 | `src/renderer/src/components/code/CodeChat.tsx` | **MODIFY** — add command approval branching + icon |
| 14 | `src/renderer/src/screens/CodeWorkspaceScreen.tsx` | **MODIFY** — nested vertical panel layout (editor + terminal) |

---

## 1. `electron.vite.config.ts` — Externalize node-pty

Add `node-pty` to rollup externals so Vite doesn't bundle it:

```ts
main: {
  build: {
    rollupOptions: {
      external: ['node-pty']
    }
  }
}
```

## 2. `electron-builder.yml` — Native Module Support

```yaml
asarUnpack:
  - resources/**
  - node_modules/node-pty/**
npmRebuild: true
```

Change `npmRebuild: false` → `true` (line 40). Native modules must be outside the asar archive.

---

## 3. `registry-types/src/index.ts` — Extend AgentApprovalRequest

```ts
export interface AgentApprovalRequest {
  requestId: string
  approvalId: string
  toolCall: ToolCall
  approvalType: 'file_write' | 'command'
  // File write fields (optional for command approvals)
  filePath?: string
  oldContent?: string
  newContent?: string
  // Command fields (optional for file write approvals)
  command?: string
  cwd?: string
}
```

**Breaking change**: `filePath`, `oldContent`, `newContent` become optional. All existing senders must set `approvalType: 'file_write'`. Renderer branches on `approvalType`.

---

## 4. `tool-definitions.ts` — Add execute_command

Append to the `AGENT_TOOLS` array:

```ts
{
  name: 'execute_command',
  description: 'Execute a shell command in the project root directory. Use this for running builds, tests, linters, git commands, package managers, or any other CLI tool. The command runs in a shell with a 30-second timeout. Returns stdout and stderr.',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'The shell command to execute (e.g., "npm test", "git status", "ls -la")'
      }
    },
    required: ['command']
  }
}
```

---

## 5. `tool-executor.ts` — Add executeCommandToolFn

Import `exec` from `child_process`:

```ts
import { exec as execCb } from 'child_process'

const COMMAND_TIMEOUT_MS = 30000

async function executeCommandToolFn(
  args: { command: string },
  rootPath: string
): Promise<string> {
  return new Promise((resolve) => {
    execCb(
      args.command,
      {
        cwd: rootPath,
        timeout: COMMAND_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, TERM: 'dumb' },
        shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/sh'
      },
      (error, stdout, stderr) => {
        let output = ''
        if (stdout) output += stdout
        if (stderr) output += (output ? '\n--- stderr ---\n' : '') + stderr
        if (error && error.killed) {
          output += `\n[Command timed out after ${COMMAND_TIMEOUT_MS / 1000}s]`
        } else if (error && !stdout && !stderr) {
          output = `Error: ${error.message}`
        }
        if (output.length > 20000) {
          output = output.slice(0, 20000) + '\n\n[...truncated at 20000 characters]'
        }
        resolve(output || '(no output)')
      }
    )
  })
}
```

Add switch case:

```ts
case 'execute_command':
  result = await executeCommandToolFn(toolCall.arguments as { command: string }, rootPath)
  break
```

---

## 6. `agent.ipc.ts` — Approval Gate Branching

Add to approval set:

```ts
const TOOLS_REQUIRING_APPROVAL = new Set(['write_file', 'execute_command'])
```

Branch approval payload by tool name:

```ts
if (TOOLS_REQUIRING_APPROVAL.has(tc.name)) {
  const approvalId = `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  if (tc.name === 'execute_command') {
    event.sender.send('agent:approval-required', {
      requestId: request.requestId,
      approvalId,
      toolCall: tc,
      approvalType: 'command',
      command: (tc.arguments as any).command || '',
      cwd: request.projectRoot
    })
  } else {
    const filePath = (tc.arguments as any).path || ''
    const newContent = (tc.arguments as any).content || ''
    const oldContent = await readExistingContent(filePath, request.projectRoot)
    event.sender.send('agent:approval-required', {
      requestId: request.requestId,
      approvalId,
      toolCall: tc,
      approvalType: 'file_write',
      filePath,
      oldContent,
      newContent
    })
  }

  const approved = await waitForApproval(approvalId)
  if (!approved) {
    const rejectMsg = tc.name === 'execute_command'
      ? `User rejected executing "${(tc.arguments as any).command}". Do not retry.`
      : `User rejected file write to "${(tc.arguments as any).path}". Do not retry.`
    toolResults.push({ toolCallId: tc.id, name: tc.name, result: rejectMsg, isError: true })
    event.sender.send('agent:tool-result', { requestId: request.requestId, toolCall: tc, result: toolResults[toolResults.length - 1] })
    continue
  }
}
```

---

## 7. `terminal.ipc.ts` — Terminal Backend (CREATE)

IPC channels:

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `terminal:create` | invoke | Spawn pty: `{ id, cwd, shell? }` → `{ id }` |
| `terminal:write` | send (one-way) | User keystrokes: `{ id, data }` |
| `terminal:resize` | send (one-way) | Resize pty: `{ id, cols, rows }` |
| `terminal:dispose` | invoke | Kill pty: `{ id }` |
| `terminal:data` | main→renderer | Pty output: `{ id, data }` |
| `terminal:exit` | main→renderer | Pty exited: `{ id, exitCode }` |

```ts
import { ipcMain } from 'electron'
import * as pty from 'node-pty'
import { platform } from 'os'

const ActiveTerminals = new Map<string, pty.IPty>()

export function registerTerminalHandlers() {
  ipcMain.handle('terminal:create', async (event, args: { id: string; cwd: string; shell?: string }) => {
    const shell = args.shell || (platform() === 'win32' ? 'powershell.exe' : process.env.SHELL || '/bin/zsh')
    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: args.cwd,
      env: process.env as Record<string, string>
    })
    ActiveTerminals.set(args.id, ptyProcess)
    ptyProcess.onData((data) => event.sender.send('terminal:data', { id: args.id, data }))
    ptyProcess.onExit(({ exitCode }) => {
      event.sender.send('terminal:exit', { id: args.id, exitCode })
      ActiveTerminals.delete(args.id)
    })
    return { id: args.id }
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
```

Note: `terminal:write` and `terminal:resize` use `ipcMain.on` (fire-and-forget) not `ipcMain.handle` — they're high-frequency operations that don't need return values.

---

## 8. `index.ts` — Register Terminal Handlers

```ts
import { registerTerminalHandlers, disposeAllTerminals } from './ipc/terminal.ipc'

// In app.whenReady():
registerTerminalHandlers()

// In app.on('will-quit'):
disposeAllTerminals()
```

---

## 9–10. `preload/index.ts` + `index.d.ts` — Terminal API

Add `terminal` namespace:

```ts
terminal: {
  create(args: { id: string; cwd: string; shell?: string }): Promise<{ id: string }>
  write(args: { id: string; data: string }): void
  resize(args: { id: string; cols: number; rows: number }): void
  dispose(args: { id: string }): Promise<void>
}
```

Implementation (note: `write`/`resize` use `send` not `invoke`):

```ts
terminal: {
  create: (args) => ipcRenderer.invoke('terminal:create', args),
  write: (args) => ipcRenderer.send('terminal:write', args),
  resize: (args) => ipcRenderer.send('terminal:resize', args),
  dispose: (args) => ipcRenderer.invoke('terminal:dispose', args)
}
```

Add event overloads:

```ts
on(channel: 'terminal:data', handler: (data: { id: string; data: string }) => void): () => void
on(channel: 'terminal:exit', handler: (data: { id: string; exitCode: number }) => void): () => void
```

---

## 11. `TerminalPanel.tsx` — xterm.js Frontend (CREATE)

Props: `{ rootPath: string }`

- Creates xterm instance with dark theme matching the app
- Spawns pty via `terminal:create` on mount
- Forwards user input via `terminal:write`
- Receives output via `terminal:data` event subscription
- Uses `FitAddon` + `ResizeObserver` for auto-sizing
- Header bar with Terminal icon and connection indicator
- Cleanup: disposes pty and xterm on unmount

Font/theme to match editor: `JetBrains Mono, SF Mono, Menlo, monospace`, 13px, Tokyo Night-inspired colors.

---

## 12. `CommandApproval.tsx` — Command Approval UI (CREATE)

Props: `{ command, cwd, onApprove, onReject }`

Visually matches `DiffReview.tsx` but shows the command in a code block instead of a diff editor:

```
┌─ ⚠ Execute Command ──────────── [Reject] [Run] ─┐
│  $ npm run build                                  │
│  cwd: /Users/user/project                         │
└───────────────────────────────────────────────────┘
```

---

## 13. `CodeChat.tsx` — Approval Branching

- Import `CommandApproval`
- Add `TerminalSquare` to `TOOL_ICONS` for `execute_command`
- Branch pending approval rendering on `approvalType`:
  - `'file_write'` → `<DiffReview />`
  - `'command'` → `<CommandApproval />`

---

## 14. `CodeWorkspaceScreen.tsx` — Nested Panel Layout

Change the middle panel from just `<EditorTabs>` to a vertical `PanelGroup`:

```tsx
<Panel defaultSize={50} minSize={25}>
  <PanelGroup orientation="vertical">
    <Panel defaultSize={70} minSize={20}>
      <EditorTabs ... />
    </Panel>
    <PanelResizeHandle className="h-1 bg-border-subtle hover:bg-primary/50 transition-colors" />
    <Panel defaultSize={30} minSize={10} collapsible={true}>
      <TerminalPanel rootPath={projectRoot} />
    </Panel>
  </PanelGroup>
</Panel>
```

The terminal panel is collapsible — user can drag it fully closed.

---

## Implementation Order

1. Install dependencies
2. `electron.vite.config.ts` + `electron-builder.yml` — build config
3. `registry-types` — extend AgentApprovalRequest
4. `tool-definitions.ts` — add execute_command schema
5. `tool-executor.ts` — add executeCommandToolFn
6. `agent.ipc.ts` — approval branching for commands
7. `terminal.ipc.ts` — create terminal backend
8. `index.ts` — register handlers
9. `preload/index.ts` + `index.d.ts` — terminal API
10. `TerminalPanel.tsx` — xterm frontend
11. `CommandApproval.tsx` — approval UI
12. `CodeChat.tsx` — approval branching + icon
13. `CodeWorkspaceScreen.tsx` — layout update
14. `npm run typecheck` — verify clean

## Verification

1. `npm run typecheck` — clean compile
2. Code workspace shows editor + terminal split vertically
3. Terminal spawns shell session, accepts user input, shows output
4. Terminal auto-resizes when panel is dragged
5. Collapsing terminal panel hides it completely
6. Agent can call `execute_command` tool (e.g., "run npm test")
7. Command approval dialog appears before execution
8. Approving runs the command, result appears as tool step in chat
9. Rejecting tells the model the command was rejected
10. Terminal cleans up on navigation away or app quit
