import { resolve, relative } from 'path'
import { readdir, readFile, writeFile, mkdir } from 'fs/promises'
import { exec as execCb } from 'child_process'
import type { ToolCall, ToolResult } from '@dexterai/registry-types'

const DEFAULT_IGNORE = ['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', '.DS_Store']

function validatePath(filePath: string, rootPath: string): string {
  const resolved = resolve(rootPath, filePath)
  const root = resolve(rootPath)
  if (!resolved.startsWith(root + '/') && resolved !== root) {
    throw new Error('Path traversal blocked: path is outside project root')
  }
  return resolved
}

function shouldIgnore(name: string): boolean {
  return DEFAULT_IGNORE.includes(name)
}

async function readFileToolFn(args: { path: string }, rootPath: string): Promise<string> {
  const resolved = validatePath(args.path, rootPath)
  const buffer = await readFile(resolved)
  // Binary check
  const sample = buffer.subarray(0, 512)
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0) return '[Binary file — cannot display]'
  }
  const content = buffer.toString('utf-8')
  // Truncate very large files
  if (content.length > 50000) {
    return content.slice(0, 50000) + '\n\n[...truncated at 50000 characters]'
  }
  return content
}

async function writeFileToolFn(args: { path: string; content: string }, rootPath: string): Promise<string> {
  const resolved = validatePath(args.path, rootPath)
  await mkdir(resolve(resolved, '..'), { recursive: true })
  await writeFile(resolved, args.content, 'utf-8')
  return `File written successfully: ${args.path}`
}

async function listDirectoryToolFn(args: { path: string }, rootPath: string): Promise<string> {
  const resolved = validatePath(args.path, rootPath)
  const entries = await readdir(resolved, { withFileTypes: true })
  const lines: string[] = []
  for (const entry of entries) {
    if (shouldIgnore(entry.name)) continue
    const type = entry.isDirectory() ? 'dir' : 'file'
    lines.push(`[${type}] ${entry.name}`)
  }
  lines.sort((a, b) => {
    const aIsDir = a.startsWith('[dir]')
    const bIsDir = b.startsWith('[dir]')
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1
    return a.localeCompare(b)
  })
  return lines.length > 0 ? lines.join('\n') : '(empty directory)'
}

async function searchCodeToolFn(args: { pattern: string; filePattern?: string }, rootPath: string): Promise<string> {
  const results: string[] = []
  const regex = new RegExp(args.pattern, 'gi')
  const maxResults = 50

  async function searchDir(dirPath: string): Promise<void> {
    if (results.length >= maxResults) return
    const entries = await readdir(dirPath, { withFileTypes: true })
    for (const entry of entries) {
      if (results.length >= maxResults) break
      if (shouldIgnore(entry.name)) continue

      const fullPath = resolve(dirPath, entry.name)
      if (entry.isDirectory()) {
        await searchDir(fullPath)
      } else if (entry.isFile()) {
        // Optional file pattern filter
        if (args.filePattern) {
          const ext = entry.name.split('.').pop() ?? ''
          const pattern = args.filePattern.replace('*.', '')
          if (!entry.name.endsWith(pattern) && ext !== pattern) continue
        }

        try {
          const buffer = await readFile(fullPath)
          // Skip binary
          const sample = buffer.subarray(0, 512)
          let isBinary = false
          for (let i = 0; i < sample.length; i++) {
            if (sample[i] === 0) { isBinary = true; break }
          }
          if (isBinary) continue

          const content = buffer.toString('utf-8')
          const lines = content.split('\n')
          for (let i = 0; i < lines.length && results.length < maxResults; i++) {
            if (regex.test(lines[i])) {
              const relPath = relative(rootPath, fullPath)
              results.push(`${relPath}:${i + 1}: ${lines[i].trim().slice(0, 200)}`)
            }
            regex.lastIndex = 0
          }
        } catch {
          // Skip unreadable files
        }
      }
    }
  }

  await searchDir(rootPath)
  if (results.length === 0) return `No matches found for "${args.pattern}"`
  let output = results.join('\n')
  if (results.length >= maxResults) output += `\n\n[...results truncated at ${maxResults} matches]`
  return output
}

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

export async function executeTool(toolCall: ToolCall, rootPath: string): Promise<ToolResult> {
  try {
    let result: string
    switch (toolCall.name) {
      case 'read_file':
        result = await readFileToolFn(toolCall.arguments as { path: string }, rootPath)
        break
      case 'write_file':
        result = await writeFileToolFn(toolCall.arguments as { path: string; content: string }, rootPath)
        break
      case 'list_directory':
        result = await listDirectoryToolFn(toolCall.arguments as { path: string }, rootPath)
        break
      case 'search_code':
        result = await searchCodeToolFn(toolCall.arguments as { pattern: string; filePattern?: string }, rootPath)
        break
      case 'execute_command':
        result = await executeCommandToolFn(toolCall.arguments as { command: string }, rootPath)
        break
      default:
        result = `Unknown tool: ${toolCall.name}`
        return { toolCallId: toolCall.id, name: toolCall.name, result, isError: true }
    }
    return { toolCallId: toolCall.id, name: toolCall.name, result }
  } catch (err: any) {
    return { toolCallId: toolCall.id, name: toolCall.name, result: `Error: ${err.message}`, isError: true }
  }
}
