import { useState, useEffect } from 'react'
import { adminApi, type AdminStats, type AdminWorkspace } from '@/api/admin'
import { extractResults } from '@/api/client'
import type { User } from '@/api/auth'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'stats' | 'users' | 'workspaces'

export function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>('stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    loadData()
  }, [isOpen, tab])

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'stats') {
        setStats(await adminApi.stats())
      } else if (tab === 'users') {
        const res = await adminApi.users()
        setUsers(extractResults(res as unknown as User[]))
      } else if (tab === 'workspaces') {
        setWorkspaces(await adminApi.workspaces())
      }
    } catch (err) {
      console.error('Admin load error:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const toggleAdmin = async (userId: number, currentStaff: boolean) => {
    try {
      const updated = await adminApi.updateUser(userId, { is_staff: !currentStaff })
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } catch {
      setError('Failed to update user')
    }
  }

  const toggleActive = async (userId: number, currentActive: boolean) => {
    try {
      const updated = await adminApi.updateUser(userId, { is_active: !currentActive })
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)))
    } catch {
      setError('Failed to update user')
    }
  }

  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return
    try {
      await adminApi.deleteUser(userId)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'detail' in err ? String((err as { detail: string }).detail) : 'Failed to delete user'
      setError(msg)
    }
  }

  const deleteWorkspace = async (wsId: number, name: string) => {
    if (!confirm(`Delete workspace "${name}"? This will delete ALL channels and messages.`)) return
    try {
      await adminApi.deleteWorkspace(wsId)
      setWorkspaces((prev) => prev.filter((w) => w.id !== wsId))
    } catch {
      setError('Failed to delete workspace')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Panel">
      <div className="min-w-[500px]">
        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-border-light pb-2">
          {(['stats', 'users', 'workspaces'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 text-sm rounded-skeu transition-colors ${
                tab === t ? 'bg-accent text-white' : 'text-muted hover:bg-surface-inset'
              }`}
            >
              {t === 'stats' ? 'Dashboard' : t === 'users' ? 'Users' : 'Workspaces'}
            </button>
          ))}
        </div>

        {error && <div className="text-xs text-danger mb-3">{error}</div>}
        {loading && <div className="text-sm text-muted mb-3">Loading...</div>}

        {/* Stats Tab */}
        {tab === 'stats' && stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Total Users" value={stats.total_users} />
            <StatCard label="Total Workspaces" value={stats.total_workspaces} />
            <StatCard label="Total Messages" value={stats.total_messages} />
            <StatCard label="Total Channels" value={stats.total_channels} />
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-2 rounded-skeu bg-surface-inset">
                <div>
                  <div className="text-sm font-medium">
                    {u.profile?.display_name || u.username}
                    <span className="text-xs text-muted ml-1">@{u.username}</span>
                  </div>
                  <div className="text-xs text-muted">{u.email}</div>
                  <div className="flex gap-1 mt-1">
                    {u.is_superuser && <span className="text-[10px] bg-danger/10 text-danger px-1.5 py-0.5 rounded">Superuser</span>}
                    {u.is_staff && !u.is_superuser && <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded">Admin</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!u.is_superuser && (
                    <>
                      <Button
                        variant={u.is_staff ? 'default' : 'primary'}
                        onClick={() => toggleAdmin(u.id, u.is_staff)}
                        className="text-xs !px-2 !py-1"
                      >
                        {u.is_staff ? 'Remove Admin' : 'Make Admin'}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => deleteUser(u.id, u.username)}
                        className="text-xs !px-2 !py-1"
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Workspaces Tab */}
        {tab === 'workspaces' && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {workspaces.map((ws) => (
              <div key={ws.id} className="flex items-center justify-between p-2 rounded-skeu bg-surface-inset">
                <div>
                  <div className="text-sm font-medium">{ws.name}</div>
                  <div className="text-xs text-muted">Owner: {ws.owner__username} | Members: {ws.member_count_val}</div>
                </div>
                <Button
                  variant="danger"
                  onClick={() => deleteWorkspace(ws.id, ws.name)}
                  className="text-xs !px-2 !py-1"
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-inset rounded-skeu p-3 text-center">
      <div className="text-2xl font-bold text-accent">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}
