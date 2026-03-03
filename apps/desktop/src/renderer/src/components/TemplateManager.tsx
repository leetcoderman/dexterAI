import { useState, useEffect } from 'react'
import { Save, FileText, Trash2, CheckCircle2 } from 'lucide-react'
import { PromptTemplate } from '@dexterai/registry-types'

interface TemplateManagerProps {
  category: string
  onLoadTemplate: (params: any) => void
  getCurrentParams: () => any
}

export default function TemplateManager({
  category,
  onLoadTemplate,
  getCurrentParams
}: TemplateManagerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [justSaved, setJustSaved] = useState(false)

  const loadTemplates = async () => {
    try {
      const data = await window.dexterai.templates.list(category)
      setTemplates(data)
    } catch (e) {
      console.error('Failed to load templates', e)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [category])

  const handleSave = async () => {
    if (!saveName.trim()) return

    const params = getCurrentParams()
    try {
      await window.dexterai.templates.save({
        name: saveName.trim(),
        category: category,
        params_json: JSON.stringify(params)
      })
      setSaveName('')
      setIsSaving(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
      loadTemplates()
    } catch (e) {
      console.error('Failed to save template', e)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      await window.dexterai.templates.delete(id)
      setTemplates(templates.filter((t) => t.id !== id))
    } catch (e) {
      console.error('Failed to delete template', e)
    }
  }

  const handleLoad = (template: PromptTemplate) => {
    try {
      const params = JSON.parse(template.params_json)
      onLoadTemplate(params)
    } catch (e) {
      console.error('Failed to parse template params', e)
    }
  }

  return (
    <div className="flex flex-col mb-4 space-y-2 relative z-10">
      <div className="flex items-center justify-between">
        {/* Template Selection */}
        <div className="flex items-center space-x-2 flex-1">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Templates
          </span>
          <div className="relative flex-1 max-w-[250px]">
            <select
              onChange={(e) => {
                if (!e.target.value) return
                const tpl = templates.find((t) => t.id === e.target.value)
                if (tpl) handleLoad(tpl)
                e.target.value = '' // Reset select
              }}
              className="w-full bg-surface border border-border text-sm rounded-md px-3 py-1.5 focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer"
              defaultValue=""
            >
              <option value="" disabled>
                Load a template...
              </option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg
                className="fill-current h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Save Current State */}
        <div className="flex items-center space-x-2">
          {justSaved && (
            <span className="text-emerald-500 text-xs flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Saved
            </span>
          )}

          {isSaving ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                autoFocus
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="Template name..."
                className="bg-surface border border-border text-sm rounded-md px-2 py-1 w-[140px] focus:outline-none focus:border-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="text-xs bg-primary text-white px-2 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setIsSaving(false)}
                className="text-xs text-gray-500 hover:text-text px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSaving(true)}
              className="flex items-center text-xs font-medium text-gray-500 border border-transparent hover:border-border hover:bg-black/5 dark:hover:bg-white/5 py-1.5 px-3 rounded-md transition-colors"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" /> Save Current
            </button>
          )}
        </div>
      </div>

      {/* Quick Template Management List (Optional: can be shown when dropdown is open, or just as a small list of "Recent") */}
      {templates.length > 0 && (
        <div className="flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">
          {templates.slice(0, 5).map((t) => (
            <div
              key={t.id}
              className="flex-shrink-0 flex items-center bg-black/5 dark:bg-white/5 border border-border rounded-full px-3 py-1 group"
            >
              <button
                onClick={() => handleLoad(t)}
                className="text-xs font-medium text-text hover:text-primary transition-colors truncate max-w-[120px]"
              >
                {t.name}
              </button>
              <button
                onClick={(e) => handleDelete(e, t.id)}
                className="ml-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
