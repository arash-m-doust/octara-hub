import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { searchApi } from '@/api/search'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import type { Message } from '@/api/messages'

export function SearchBar() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Message[]>([])
  const [searching, setSearching] = useState(false)
  const { currentWorkspace } = useWorkspaceStore()

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await searchApi.messages({
        q: query,
        workspace_id: currentWorkspace?.id,
      })
      setResults(res.results)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          className="skeu-input flex-1"
          placeholder={t('search.placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
      </div>
      {searching && <p className="text-xs text-muted">{t('common.loading')}</p>}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((msg) => (
            <div key={msg.id} className="p-2 rounded-skeu bg-surface-inset text-sm">
              <div className="text-xs text-muted mb-1">
                {msg.user.profile?.display_name || msg.user.username}
              </div>
              <p className="text-gray-700">{msg.content}</p>
            </div>
          ))}
        </div>
      )}
      {!searching && results.length === 0 && query && (
        <p className="text-xs text-muted">{t('search.noResults')}</p>
      )}
    </div>
  )
}
