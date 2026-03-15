import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useUIStore } from '@/stores/uiStore'
import { Tooltip } from '@/components/ui/Tooltip'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function ServerRail() {
  const { t } = useTranslation()
  const { workspaces, currentWorkspace, setCurrentWorkspace, createWorkspace } = useWorkspaceStore()
  const { view, setView } = useUIStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const handleCreate = async () => {
    if (!newName.trim()) return
    const ws = await createWorkspace({ name: newName.trim() })
    setCurrentWorkspace(ws)
    setShowCreate(false)
    setNewName('')
  }

  return (
    <div className="w-[56px] flex-shrink-0 bg-surface-inset flex flex-col items-center py-3 gap-2 border-e border-border">
      {/* DM Button */}
      <Tooltip content={t('dm.title')} position="right">
        <button
          onClick={() => setView('dm')}
          className={`w-10 h-10 rounded-skeu flex items-center justify-center text-lg transition-all ${
            view === 'dm' ? 'bg-accent text-white shadow-skeu-raised' : 'bg-surface-raised hover:bg-white shadow-skeu-embossed'
          }`}
        >
          💬
        </button>
      </Tooltip>

      <div className="w-6 h-px bg-border my-1" />

      {/* Workspace Icons */}
      {workspaces.map((ws) => (
        <Tooltip key={ws.id} content={ws.name} position="right">
          <button
            onClick={() => {
              setCurrentWorkspace(ws)
              setView('workspace')
            }}
            className={`w-10 h-10 rounded-skeu flex items-center justify-center text-sm font-bold transition-all ${
              currentWorkspace?.id === ws.id
                ? 'bg-accent text-white shadow-skeu-raised'
                : 'bg-surface-raised hover:bg-white shadow-skeu-embossed text-accent'
            }`}
          >
            {ws.icon_path ? (
              <img src={ws.icon_path} alt={ws.name} className="w-full h-full rounded-skeu object-cover" />
            ) : (
              ws.name.slice(0, 2).toUpperCase()
            )}
          </button>
        </Tooltip>
      ))}

      {/* Add Workspace */}
      <Tooltip content={t('workspace.create')} position="right">
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-skeu flex items-center justify-center bg-surface-raised hover:bg-white shadow-skeu-embossed text-success text-xl transition-all"
        >
          +
        </button>
      </Tooltip>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t('workspace.create')}>
        <div className="space-y-4">
          <Input
            label={t('workspace.name')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleCreate}>{t('workspace.create')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
