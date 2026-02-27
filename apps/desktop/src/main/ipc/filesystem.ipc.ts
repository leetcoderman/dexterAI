import { ipcMain, dialog } from 'electron'
import { resolve, basename, extname, relative } from 'path'
import { readdir, readFile, writeFile, stat, mkdir } from 'fs/promises'

interface SearchMatch {
  filePath: string
  line: number
  text: string
}

interface FileTreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  children?: FileTreeNode[]
}

const DEFAULT_IGNORE = [
  'node_modules',
  '.git',
  'dist',
  'build',
  '__pycache__',
  '.next',
  '.DS_Store'
]

function validatePath(filePath: string, rootPath: string): string {
  const root = resolve(rootPath)
  // If filePath is absolute, check if it's inside root
  // If filePath is relative, resolve it relative to root
  const resolved = resolve(root, filePath)

  if (!resolved.startsWith(root + '/') && resolved !== root) {
    throw new Error('Path traversal blocked: path is outside project root')
  }
  return resolved
}

function shouldIgnore(name: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((pattern) => name === pattern)
}

async function buildTree(
  dirPath: string,
  rootPath: string,
  ignorePatterns: string[],
  depth: number,
  maxDepth: number
): Promise<FileTreeNode[]> {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const nodes: FileTreeNode[] = []

  for (const entry of entries) {
    if (shouldIgnore(entry.name, ignorePatterns)) continue

    const entryPath = resolve(dirPath, entry.name)
    const relativePath = relative(rootPath, entryPath)

    if (entry.isDirectory()) {
      const node: FileTreeNode = {
        name: entry.name,
        path: relativePath,
        type: 'dir'
      }
      if (depth < maxDepth) {
        node.children = await buildTree(entryPath, rootPath, ignorePatterns, depth + 1, maxDepth)
      }
      nodes.push(node)
    } else if (entry.isFile()) {
      nodes.push({
        name: entry.name,
        path: relativePath,
        type: 'file'
      })
    }
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return nodes
}

function isBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 512)
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return true
  }
  return false
}

export function registerFilesystemHandlers() {
  ipcMain.handle('fs:openFolder', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Open Project Folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    const rootPath = result.filePaths[0]
    return { rootPath, name: basename(rootPath) }
  })

  ipcMain.handle(
    'fs:readDir',
    async (_, { rootPath, ignorePatterns }: { rootPath: string; ignorePatterns?: string[] }) => {
      const patterns = ignorePatterns ?? DEFAULT_IGNORE
      return buildTree(resolve(rootPath), resolve(rootPath), patterns, 0, 6)
    }
  )

  ipcMain.handle(
    'fs:readDirShallow',
    async (_, { dirPath, rootPath }: { dirPath: string; rootPath: string }) => {
      const resolved = validatePath(dirPath, rootPath)
      const entries = await readdir(resolved, { withFileTypes: true })
      const nodes: FileTreeNode[] = []

      for (const entry of entries) {
        if (shouldIgnore(entry.name, DEFAULT_IGNORE)) continue
        const entryPath = resolve(resolved, entry.name)
        const relativePath = relative(resolve(rootPath), entryPath)

        if (entry.isDirectory()) {
          nodes.push({ name: entry.name, path: relativePath, type: 'dir' })
        } else if (entry.isFile()) {
          nodes.push({ name: entry.name, path: relativePath, type: 'file' })
        }
      }

      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
        return a.name.localeCompare(b.name)
      })

      return nodes
    }
  )

  ipcMain.handle(
    'fs:readFile',
    async (_, { filePath, rootPath }: { filePath: string; rootPath: string }) => {
      try {
        const resolved = validatePath(filePath, rootPath)
        const buffer = await readFile(resolved)
        if (isBinary(buffer)) {
          return { error: 'Binary file — cannot display' }
        }
        return { content: buffer.toString('utf-8'), size: buffer.length }
      } catch (err: any) {
        return { error: err.message }
      }
    }
  )

  ipcMain.handle(
    'fs:writeFile',
    async (
      _,
      { filePath, rootPath, content }: { filePath: string; rootPath: string; content: string }
    ) => {
      try {
        const resolved = validatePath(filePath, rootPath)
        await mkdir(resolve(resolved, '..'), { recursive: true })
        await writeFile(resolved, content, 'utf-8')
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }
  )

  ipcMain.handle(
    'fs:stat',
    async (_, { filePath, rootPath }: { filePath: string; rootPath: string }) => {
      try {
        const resolved = validatePath(filePath, rootPath)
        const s = await stat(resolved)
        return {
          size: s.size,
          modified: s.mtime.toISOString(),
          isDir: s.isDirectory(),
          extension: extname(resolved)
        }
      } catch (err: any) {
        return { error: err.message }
      }
    }
  )

  ipcMain.handle(
    'fs:search',
    async (
      _,
      { rootPath, query, filePattern }: { rootPath: string; query: string; filePattern?: string }
    ) => {
      const results: SearchMatch[] = []
      const maxResults = 100
      let regex: RegExp
      try {
        regex = new RegExp(query, 'gi')
      } catch {
        regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
      }

      async function searchDir(dirPath: string): Promise<void> {
        if (results.length >= maxResults) return
        let entries
        try {
          entries = await readdir(dirPath, { withFileTypes: true })
        } catch {
          return
        }
        for (const entry of entries) {
          if (results.length >= maxResults) break
          if (shouldIgnore(entry.name, DEFAULT_IGNORE)) continue

          const fullPath = resolve(dirPath, entry.name)
          if (entry.isDirectory()) {
            await searchDir(fullPath)
          } else if (entry.isFile()) {
            if (filePattern) {
              const ext = entry.name.split('.').pop() ?? ''
              const pat = filePattern.replace('*.', '')
              if (!entry.name.endsWith(pat) && ext !== pat) continue
            }
            try {
              const buffer = await readFile(fullPath)
              if (isBinary(buffer)) continue
              const content = buffer.toString('utf-8')
              const lines = content.split('\n')
              for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                if (regex.test(lines[i])) {
                  results.push({
                    filePath: relative(resolve(rootPath), fullPath),
                    line: i + 1,
                    text: lines[i].trim().slice(0, 200)
                  })
                }
                regex.lastIndex = 0
              }
            } catch {
              // Skip unreadable files
            }
          }
        }
      }

      await searchDir(resolve(rootPath))
      return { results, truncated: results.length >= maxResults }
    }
  )
}
