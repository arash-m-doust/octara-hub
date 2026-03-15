import { useUIStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { Avatar } from '@/components/ui/Avatar'
import { useTranslation } from 'react-i18next'

export function RightPanel() {
  const { t } = useTranslation()
  const { rightPanel, setRightPanel } = useUIStore()
  const { members } = useWorkspaceStore()

  return (
    <div className="w-[260px] flex-shrink-0 bg-surface-raised border-s border-border-light flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border-light flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          {rightPanel === 'members' && t('workspace.members')}
          {rightPanel === 'files' && t('files.browser')}
          {rightPanel === 'pinned' && t('chat.pinned')}
          {rightPanel === 'search' && t('search.messages')}
        </h3>
        <button
          onClick={() => setRightPanel(null)}
          className="text-muted hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {rightPanel === 'members' && (
          <div className="space-y-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-1.5 rounded-skeu hover:bg-surface-inset">
                <Avatar
                  name={m.user.profile?.display_name || m.user.username}
                  size="sm"
                  status={m.user.profile?.status}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.nickname || m.user.profile?.display_name || m.user.username}
                  </div>
                  {m.role && (
                    <div className="text-[10px] text-muted">{m.role.name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
