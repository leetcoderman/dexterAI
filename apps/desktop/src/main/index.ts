import { app, shell, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initDatabase, closeDatabase } from './db/database'

import { registerProviderHandlers } from './ipc/provider.ipc'
import { registerCredentialHandlers } from './ipc/credentials.ipc'
import { registerHistoryHandlers } from './ipc/history.ipc'
import { registerTemplateHandlers } from './ipc/templates.ipc'
import { registerFileHandlers } from './ipc/files.ipc'
import { registerRegistryHandlers } from './ipc/registry.ipc'
import { registerConversationHandlers } from './ipc/conversations.ipc'
import { registerMessageHandlers } from './ipc/messages.ipc'
import { registerChatHandlers } from './ipc/chat.ipc'
import { registerMemoryHandlers } from './ipc/memory.ipc'
import { registerSettingsHandlers } from './ipc/settings.ipc'
import { registerFilesystemHandlers } from './ipc/filesystem.ipc'
import { registerAgentHandlers } from './ipc/agent.ipc'
import { registerTerminalHandlers, disposeAllTerminals } from './ipc/terminal.ipc'
import { AdapterRegistry } from './adapters/adapter-registry'
import { OpenAIAdapter } from './adapters/openai.adapter'
import { AnthropicAdapter } from './adapters/anthropic.adapter'
import { DeepgramAdapter } from './adapters/deepgram.adapter'
import { GoogleAdapter } from './adapters/google.adapter'
import { NvidiaAdapter } from './adapters/nvidia.adapter'
import { GithubAdapter } from './adapters/github.adapter'
// Register provider adapters
AdapterRegistry.register(new OpenAIAdapter())
AdapterRegistry.register(new AnthropicAdapter())
AdapterRegistry.register(new DeepgramAdapter())
AdapterRegistry.register(new GoogleAdapter())
AdapterRegistry.register(new NvidiaAdapter())
AdapterRegistry.register(new GithubAdapter())

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      // sandbox: false is required to allow the preload script to load native Node modules
      // (keytar for OS keychain, better-sqlite3, node-pty). contextIsolation remains enabled
      // via contextBridge, ensuring the renderer has no direct Node access.
      // Track: https://github.com/leetcoderman/dexterAI/issues — "Evaluate Electron sandbox re-enablement"
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Build a custom application menu with zoom accelerators
  // This ensures Cmd+/- are not swallowed by Electron's default menu
  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: () => mainWindow.webContents.send('zoom:change', 'in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow.webContents.send('zoom:change', 'out')
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: () => mainWindow.webContents.send('zoom:change', 'reset')
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'togglefullscreen' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.dexterai.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Initialize DB
  initDatabase()

  // Register Handlers
  registerProviderHandlers()
  registerCredentialHandlers()
  registerHistoryHandlers()
  registerTemplateHandlers()
  registerFileHandlers()
  registerRegistryHandlers()
  registerConversationHandlers()
  registerMessageHandlers()
  registerChatHandlers()
  registerMemoryHandlers()
  registerSettingsHandlers()
  registerFilesystemHandlers()
  registerAgentHandlers()
  registerTerminalHandlers()

  // Window management
  ipcMain.handle('app:openWindow', () => {
    createWindow()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('will-quit', () => {
  disposeAllTerminals()
  closeDatabase()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
