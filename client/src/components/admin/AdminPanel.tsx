import { useState, useEffect } from 'react'
import { adminApi, type AdminStats, type AdminWorkspace } from '@/api/admin'
import { extractResults } from '@/api/client'
import type { User } from '@/api/auth'
import { Modal } from '@/components/ui/Modal'
import {
  BarChart3, Users, Globe, MessageSquare, Hash,
  ShieldCheck, ShieldOff, UserX, Trash2, Crown,
  Activity, Server, Loader2, type LucideIcon
} from 'lucide-react'

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

type Tab = 'stats' | 'users' | 'workspaces'

const TAB_CONFIG = [
  { key: 'stats' as Tab, label: 'Dashboard', icon: BarChart3 },
  { key: 'users' as Tab, label: 'Users', icon: Users },
  { key: 'workspaces' as Tab, label: 'Workspaces', icon: Globe },
]

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
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Panel" size="lg">
      <div className="flex gap-4 min-h-[420px]">
        {/* Sidebar nav */}
        <div className="w-44 flex-shrink-0 border-e border-border-light pe-4 space-y-1">
          {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-skeu text-sm transition-all text-start ${
                tab === key
                  ? 'bg-accent text-white shadow-skeu-raised'
                  : 'hover:bg-surface-inset'
              }`}
              style={tab !== key ? { color: 'var(--color-text-secondary)' } : {}}
            >
              <Icon size={16} />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="flex items-center gap-2 text-xs text-error mb-3 p-2 rounded-skeu bg-error/10">
              <Activity size={14} />
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted">
              <Loader2 size={20} className="animate-spin" />
              <span className="ml-2 text-sm">Loading...</span>
            </div>
          ) : (
            <>
              {/* Dashboard */}
              {tab === 'stats' && stats && (
                <div className="grid grid-cols-2 gap-3">
                  <StatCard icon={Users} label="Total Users" value={stats.total_users} color="text-accent" bg="bg-accent/10" />
                  <StatCard icon={Server} label="Workspaces" value={stats.total_workspaces} color="text-lavender" bg="bg-lavender/10" />
                  <StatCard icon={MessageSquare} label="Messages" value={stats.total_messages} color="text-success" bg="bg-success/10" />
                  <StatCard icon={Hash} label="Channels" value={stats.total_channels} color="text-warning" bg="bg-warning/10" />
                </div>
              )}

              {/* Users */}
              {tab === 'users' && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-skeu bg-surface-inset border border-border-light">
                      <div className="w-9 h-9 rounded-full bg-accent-soft flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-accent">
                          {(u.profile?.display_name || u.username).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                            {u.profile?.display_name || u.username}
                          </span>
                          <span className="text-xs text-muted">@{u.username}</span>
                        </div>
                        <div className="text-xs text-muted truncate">{u.email}</div>
                        <div className="flex gap-1.5 mt-1">
                          {u.is_superuser && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-error/10 text-error px-1.5 py-0.5 rounded-full font-medium">
                              <Crown size={10} /> Superuser
                            </span>
                          )}
                          {u.is_staff && !u.is_superuser && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full font-medium">
                              <ShieldCheck size={10} /> Admin
                            </span>
                          )}
                        </div>
                      </div>
                      {!u.is_superuser && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => toggleAdmin(u.id, u.is_staff)}
                            className={`p-1.5 rounded-skeu transition-all ${
                              u.is_staff
                                ? 'bg-warning/10 text-warning hover:bg-warning/20'
                                : 'bg-accent/10 text-accent hover:bg-accent/20'
                            }`}
                            title={u.is_staff ? 'Remove Admin' : 'Make Admin'}
                          >
                            {u.is_staff ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                          </button>
                          <button
                            onClick={() => deleteUser(u.id, u.username)}
                            className="p-1.5 rounded-skeu bg-error/10 text-error hover:bg-error/20 transition-all"
                            title="Delete User"
                          >
                            <UserX size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center py-8 text-muted text-sm">No users found</div>
                  )}
                </div>
              )}

              {/* Workspaces */}
              {tab === 'workspaces' && (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="flex items-center gap-3 p-3 rounded-skeu bg-surface-inset border border-border-light">
                      <div className="w-9 h-9 rounded-skeu bg-lavender/15 flex items-center justify-center flex-shrink-0">
                        <Server size={16} className="text-lavender" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{ws.name}</div>
                        <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
                          <span className="inline-flex items-center gap-1">
                            <Crown size={10} /> {ws.owner__username}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Users size={10} /> {ws.member_count_val} members
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteWorkspace(ws.id, ws.name)}
                        className="p-1.5 rounded-skeu bg-error/10 text-error hover:bg-error/20 transition-all"
                        title="Delete Workspace"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {workspaces.length === 0 && (
                    <div className="text-center py-8 text-muted text-sm">No workspaces found</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: LucideIcon
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className="bg-surface-inset rounded-skeu-lg p-4 border border-border-light">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-skeu ${bg} flex items-center justify-center`}>
          <Icon size={20} className={color} />
        </div>
        <div>
          <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{value.toLocaleString()}</div>
          <div className="text-xs text-muted">{label}</div>
        </div>
      </div>
    </div>
  )
}
