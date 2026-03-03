import type { ToolDefinition } from '@dexterai/registry-types'

export const AGENT_TOOLS: ToolDefinition[] = [
  {
    name: 'read_file',
    description:
      'Read the contents of a file at the given path relative to the project root. Returns the file content as a string. Use this to understand existing code before making changes.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to the project root'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description:
      'Write content to a file at the given path relative to the project root. Creates the file if it does not exist, or overwrites it if it does. Parent directories are created automatically.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to the project root'
        },
        content: {
          type: 'string',
          description: 'The full content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_directory',
    description:
      'List files and directories at the given path relative to the project root. Returns a structured list of entries with their names and types (file or directory).',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path relative to the project root. Use "." for the project root.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'search_code',
    description:
      'Search for a text pattern across all files in the project. Returns matching lines with file paths and line numbers. Useful for finding usages, definitions, or patterns.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'The text or regex pattern to search for'
        },
        filePattern: {
          type: 'string',
          description: 'Optional glob to filter files, e.g. "*.ts" or "src/**/*.tsx"'
        }
      },
      required: ['pattern']
    }
  },
  {
    name: 'execute_command',
    description:
      'Execute a shell command in the project root directory. Use this for running builds, tests, linters, git commands, package managers, or any other CLI tool. The command runs in a shell with a 30-second timeout. Returns stdout and stderr.',
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
]
