# Security Policy

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub Issues.**

To report a security issue privately:
1. email the maintainer directly (see GitHub profile for contact)

Please include:
- Description of the vulnerability and its potential impact
- Steps to reproduce (proof of concept if possible)
- Affected version(s)
- Any suggested mitigations

You will receive an acknowledgement within 72 hours. We aim to release a patch within 14 days of confirmation for critical and high-severity issues.

---

## Security Model

dexterAI is a local-first desktop app. Understanding its trust boundaries helps assess the impact of any finding.

### API Key Storage
All provider API keys are stored exclusively in the **OS-native keychain** (`keytar` → macOS Keychain / Windows Credential Manager / libsecret on Linux). Keys are never written to disk, SQLite, `localStorage`, or any config file. They are loaded into memory only for the duration of a single API call.

### Electron Process Isolation
- The renderer process (React UI) runs with **no direct Node.js or filesystem access**
- The `contextBridge` API surface in `preload/index.ts` is the only channel between renderer and main process
- `sandbox: false` is set on the BrowserWindow — this is required to load native Node modules (`keytar`, `better-sqlite3`, `node-pty`) in the preload script. `contextIsolation` remains fully enabled

### Agent Tool Execution
The Agentic Workspace feature can execute shell commands and read/write files within a user-selected project folder. **Every destructive or shell command requires explicit user approval** via the `CommandApproval` UI gate before it is forwarded to `child_process.exec`. Commands run with the same OS permissions as the app (no privilege escalation). The working directory is locked to the selected project root — path traversal outside this boundary is blocked at the IPC level.

### Local Data
Conversation history, memories, and test run metrics are stored in a local SQLite database (`userData/dexterai.sqlite`). This file is not synced or transmitted anywhere.

### No Telemetry
dexterAI does not collect telemetry, analytics, or usage data.

---

## Supported Versions

| Version | Supported |
|---------|-----------|
| 3.2.x   | ✅ Active  |
| < 3.0   | ❌ EOL     |
