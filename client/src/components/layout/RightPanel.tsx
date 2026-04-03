import { useState, useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useWorkspaceStore } from '@/stores/workspaceStore'
import { useAuthStore } from '@/stores/authStore'
import { useDMStore } from '@/stores/dmStore'
import { Avatar } from '@/components/ui/Avatar'
import { useTranslation } from 'react-i18next'
import { fileApi, type Attachment } from '@/api/files'
import { searchApi } from '@/api/search'
import { messageApi, type Message } from '@/api/messages'
import { extractResults } from '@/api/client'
import { workspaceApi, type Role } from '@/api/workspaces'
import { toast } from '@/components/ui/Toast'
import { Pin as PinIcon } from 'lucide-react'
import {
  X, Download, Search, FileText, Image, Film, Music,
  FileSpreadsheet, FileCode, Archive, File, Loader2, MessageSquare, Eye
} from 'lucide-react'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return { icon: Image, color: 'var(--color-accent)' }
  if (mimeType.startsWith('video/')) return { icon: Film, color: '#9B8FBF' }
  if (mimeType.startsWith('audio/')) return { icon: Music, color: 'var(--color-led-idle)' }
  if (mimeType.includes('pdf')) return { icon: FileText, color: '#FF5252' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv'))
    return { icon: FileSpreadsheet, color: 'var(--color-led-online)' }
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z'))
    return { icon: Archive, color: 'var(--color-led-idle)' }
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('javascript') || mimeType.includes('html'))
    return { icon: FileCode, color: 'var(--color-accent)' }
  return { icon: File, color: 'var(--color-text-muted)' }
}

function FileItem({ file }: { file: Attachment }) {
  const isImage = file.mime_type.startsWith('image/')
  const isOffice = (
    file.mime_type === 'application/msword' ||
    file.mime_type === 'application/vnd.ms-excel' ||
    file.mime_type === 'application/vnd.ms-powerpoint' ||
    file.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    file.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.mime_type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    file.mime_type === 'application/vnd.ms-excel.sheet.macroEnabled.12' ||
    file.mime_type === 'application/vnd.ms-word.document.macroEnabled.12' ||
    file.mime_type === 'application/vnd.ms-powerpoint.presentation.macroEnabled.12'
  )
  const previewUrl = file.preview_url ? `/api${file.preview_url}` : null
  const downloadUrl = `/api${file.download_url}`
  const { icon: FileIcon, color } = getFileIcon(file.mime_type)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [officePreviewUrl, setOfficePreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (officePreviewUrl) {
        URL.revokeObjectURL(officePreviewUrl)
      }
    }
  }, [officePreviewUrl])

  const openOfficePreview = async () => {
    if (!file.preview_url) {
      toast.info('Preview unavailable. Download the file to view it.')
      return
    }
    setPreviewLoading(true)
    try {
      if (officePreviewUrl) {
        URL.revokeObjectURL(officePreviewUrl)
      }
      const blob = await fileApi.previewBlob(file.preview_url)
      const objectUrl = URL.createObjectURL(blob)
      setOfficePreviewUrl(objectUrl)
      setPreviewOpen(true)
    } catch {
      toast.error('Preview failed. Download the file to view it.')
    } finally {
      setPreviewLoading(false)
    }
  }

  const closeOfficePreview = () => {
    setPreviewOpen(false)
    if (officePreviewUrl) {
      URL.revokeObjectURL(officePreviewUrl)
      setOfficePreviewUrl(null)
    }
  }

  return (
    <div className="flex items-center gap-2.5 p-2 rounded-ind hover:bg-surface-inset group transition-all">
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={file.original_filename} className="w-10 h-10 rounded-ind object-cover flex-shrink-0" style={{ border: '1px solid var(--color-border)' }} />
      ) : (
        <div className="w-10 h-10 rounded-ind ind-recess flex items-center justify-center flex-shrink-0">
          <FileIcon size={18} style={{ color }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{file.original_filename}</div>
        <div className="text-[10px] text-muted">{formatFileSize(file.file_size)}</div>
      </div>
      {isOffice && (
        <button
          type="button"
          onClick={() => void openOfficePreview()}
          disabled={previewLoading}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-ind transition-all disabled:opacity-50"
          style={{ color: 'color-mix(in srgb, var(--color-accent) 60%, var(--color-text-primary) 40%)' }}
          title="Preview"
        >
          <Eye size={14} />
        </button>
      )}
      <a
        href={downloadUrl}
        download={file.original_filename}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-ind transition-all"
        style={{ color: 'color-mix(in srgb, var(--color-accent) 60%, var(--color-text-primary) 40%)' }}
        title="Download"
      >
        <Download size={14} />
      </a>
      {previewOpen && officePreviewUrl && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="w-[92vw] h-[88vh] rounded-ind-lg overflow-hidden" style={{ background: 'var(--color-surface-raised)' }}>
            <iframe src={officePreviewUrl} className="w-full h-full" title={file.original_filename} />
          </div>
          <button
            type="button"
            onClick={closeOfficePreview}
            className="absolute top-4 end-4 px-3 py-1.5 rounded-ind ind-button"
          >
            Close
          </button>
        </div>
      )}
    </div>
  )
}

interface RightPanelProps {
  width?: number
}

export function RightPanel({ width = 260 }: RightPanelProps) {
  const { t } = useTranslation()
  const { rightPanel, setRightPanel, setView, searchQuery, setSearchQuery } = useUIStore()
  const { members, workspaceUsers, currentWorkspace, currentChannel, fetchWorkspaceUsers, inviteMember, kickMember, updateMemberRole } = useWorkspaceStore()
  const currentUser = useAuthStore((s) => s.user)
  const { createThread, setCurrentThread, fetchThreads } = useDMStore()

  const handleOpenDM = async (userId: number) => {
    try {
      const thread = await createThread([userId])
      await fetchThreads()
      setCurrentThread(thread)
      setView('dm')
    } catch (err) {
      console.error('Failed to open DM:', err)
    }
  }
  const [files, setFiles] = useState<Attachment[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<Message[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [pinnedMessages, setPinnedMessages] = useState<{ id: number; message: Message; created_at: string }[]>([])
  const [pinnedLoading, setPinnedLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [invitingUserId, setInvitingUserId] = useState<number | null>(null)
  const [memberActionError, setMemberActionError] = useState('')
  const [memberActionKey, setMemberActionKey] = useState<string | null>(null)
  const [workspaceRoles, setWorkspaceRoles] = useState<Role[]>([])

  const myMembership = members.find((m) => m.user.id === currentUser?.id)
  const canInviteMembers = !!currentWorkspace && (
    !!currentUser?.is_superuser ||
    currentWorkspace.is_owner ||
    (!!currentUser?.is_staff && !!myMembership) ||
    !!myMembership?.role?.permissions?.kick_members
  )
  const canKickMembers = canInviteMembers
  const canPromoteDemote = !!currentWorkspace && !!currentUser?.is_superuser
  const normalizedUserSearch = userSearch.trim().toLowerCase()
  const workspaceUsersFiltered = members.filter((member) => {
    if (!normalizedUserSearch) return true
    const displayName = member.nickname || member.user.profile?.display_name || member.user.username
    return displayName.toLowerCase().includes(normalizedUserSearch) || member.user.username.toLowerCase().includes(normalizedUserSearch)
  })
  const platformUsersFiltered = workspaceUsers.filter((workspaceUser) => {
    if (!normalizedUserSearch) return true
    const displayName = workspaceUser.profile?.display_name || workspaceUser.username
    return displayName.toLowerCase().includes(normalizedUserSearch) || workspaceUser.username.toLowerCase().includes(normalizedUserSearch)
  })

  const resolveWorkspaceRole = (memberUserId: number, role?: { permissions?: Record<string, boolean>; name?: string } | null) => {
    if (currentWorkspace?.owner === memberUserId) {
      return { label: 'Owner', tone: 'owner' as const }
    }
    if (role?.permissions?.manage_channels) {
      return { label: 'Admin', tone: 'admin' as const }
    }
    return { label: 'Member', tone: 'member' as const }
  }

  const roleBadgeStyle = (tone: 'owner' | 'admin' | 'member') => {
    if (tone === 'owner') {
      return {
        color: '#e2b45e',
        border: '1px solid #e2b45e',
        backgroundColor: 'rgba(226, 180, 94, 0.14)',
      }
    }
    if (tone === 'admin') {
      return {
        color: 'var(--color-accent)',
        border: '1px solid var(--color-accent)',
        backgroundColor: 'var(--color-accent-soft)',
      }
    }
    return {
      color: 'var(--color-text-secondary)',
      border: '1px solid var(--color-border)',
      backgroundColor: 'var(--color-surface-inset)',
    }
  }

  useEffect(() => {
    if (rightPanel !== 'pinned' || !currentChannel) return
    setPinnedLoading(true)
    messageApi.pinnedMessages(currentChannel.id)
      .then((res) => {
        const items = extractResults(res as unknown as { id: number; message: Message; created_at: string }[])
        setPinnedMessages(Array.isArray(items) ? items : [])
      })
      .catch(() => setPinnedMessages([]))
      .finally(() => setPinnedLoading(false))
  }, [rightPanel, currentChannel?.id])

  useEffect(() => {
    if (rightPanel !== 'files' || !currentChannel) return
    setFilesLoading(true)
    fileApi.channelFiles(currentChannel.id)
      .then((res) => setFiles(extractResults(res)))
      .catch(() => setFiles([]))
      .finally(() => setFilesLoading(false))
  }, [rightPanel, currentChannel?.id])

  useEffect(() => {
    if (rightPanel !== 'members' || !currentWorkspace) return
    const timeout = setTimeout(() => {
      fetchWorkspaceUsers(currentWorkspace.id, userSearch.trim() || undefined)
    }, 250)
    return () => clearTimeout(timeout)
  }, [rightPanel, currentWorkspace?.id, userSearch, fetchWorkspaceUsers])

  useEffect(() => {
    if (rightPanel !== 'search') return
    const timeout = setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('[placeholder=\"Search messages...\"]')
      input?.focus()
    }, 50)
    return () => clearTimeout(timeout)
  }, [rightPanel])

  useEffect(() => {
    if (rightPanel !== 'members' || !currentWorkspace || !canPromoteDemote) {
      setWorkspaceRoles([])
      return
    }
    workspaceApi.roles(currentWorkspace.id)
      .then((res) => {
        const roles = extractResults(res)
        setWorkspaceRoles(Array.isArray(roles) ? roles : [])
      })
      .catch(() => setWorkspaceRoles([]))
  }, [rightPanel, currentWorkspace?.id, canPromoteDemote])

  const getRoleIdByName = (name: 'Member' | 'Admin') => {
    return workspaceRoles.find((role) => role.name === name)?.id
  }
  const memberRoleId = getRoleIdByName('Member')
  const adminRoleId = getRoleIdByName('Admin')

  const handleInvite = async (userId: number) => {
    if (!currentWorkspace) return
    setMemberActionError('')
    setInvitingUserId(userId)
    try {
      await inviteMember(currentWorkspace.id, userId)
      await fetchWorkspaceUsers(currentWorkspace.id, userSearch.trim() || undefined)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'detail' in err
        ? String((err as { detail: string }).detail)
        : 'Failed to invite user'
      setMemberActionError(msg)
    } finally {
      setInvitingUserId(null)
    }
  }

  const handleKick = async (userId: number) => {
    if (!currentWorkspace) return
    setMemberActionError('')
    setMemberActionKey(`kick-${userId}`)
    try {
      await kickMember(currentWorkspace.id, userId)
      await fetchWorkspaceUsers(currentWorkspace.id, userSearch.trim() || undefined)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'detail' in err
        ? String((err as { detail: string }).detail)
        : 'Failed to remove member'
      setMemberActionError(msg)
    } finally {
      setMemberActionKey(null)
    }
  }

  const handleRoleToggle = async (memberUserId: number, isAdmin: boolean) => {
    if (!currentWorkspace) return
    if (!memberRoleId || !adminRoleId) {
      setMemberActionError('Required workspace roles are not available yet.')
      return
    }
    const targetRoleId = isAdmin ? memberRoleId : adminRoleId
    setMemberActionError('')
    setMemberActionKey(`role-${memberUserId}`)
    try {
      await updateMemberRole(currentWorkspace.id, memberUserId, targetRoleId)
      await fetchWorkspaceUsers(currentWorkspace.id, userSearch.trim() || undefined)
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'detail' in err
        ? String((err as { detail: string }).detail)
        : 'Failed to update role'
      setMemberActionError(msg)
    } finally {
      setMemberActionKey(null)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    try {
      const res = await searchApi.messages({ q: searchQuery })
      setSearchResults(res.results)
    } catch {
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  return (
    <div
      className="flex-shrink-0 flex flex-col border-s"
      style={{
        width: `${width}px`,
        background: 'linear-gradient(180deg, var(--color-surface-plate) 0%, var(--color-surface-inset) 100%)',
        borderColor: 'var(--color-border-groove)',
      }}
    >
      {/* Header */}
      <div className="p-3 flex items-center justify-between" style={{ borderBottom: '2px solid transparent', borderImage: 'linear-gradient(90deg, var(--color-border-groove), var(--color-metal-highlight), var(--color-border-groove)) 1' }}>
        <h3 className="ind-label text-xs">
          {rightPanel === 'members' && t('workspace.members')}
          {rightPanel === 'files' && t('files.browser')}
          {rightPanel === 'pinned' && t('chat.pinned')}
          {rightPanel === 'search' && t('search.messages')}
        </h3>
        <button
          onClick={() => setRightPanel(null)}
          className="w-6 h-6 flex items-center justify-center rounded-ind ind-button p-0 text-muted"
        >
          <X size={12} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Members */}
        {rightPanel === 'members' && (
          <div className="space-y-2">
            <input
              type="text"
              className="ind-input text-xs"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              dir="auto"
              style={{ unicodeBidi: 'plaintext' }}
            />
            {memberActionError && <p className="text-xs text-error">{memberActionError}</p>}
            <div className="space-y-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider px-1 mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Workspace Users
                </div>
                <div className="space-y-1">
                  {workspaceUsersFiltered.map((member) => {
                    const displayName = member.nickname || member.user.profile?.display_name || member.user.username
                    const isSelf = currentUser?.id === member.user.id
                    const isOwner = currentWorkspace?.owner === member.user.id
                    const roleBadge = resolveWorkspaceRole(member.user.id, member.role)
                    const isAdminRole = roleBadge.tone === 'admin'
                    const canKickThisMember = canKickMembers && !isSelf && !isOwner
                    const canToggleRole = canPromoteDemote && !isSelf && !isOwner && !!memberRoleId && !!adminRoleId
                    const isRoleActionLoading = memberActionKey === `role-${member.user.id}`
                    const isKickActionLoading = memberActionKey === `kick-${member.user.id}`

                    return (
                      <div key={`workspace-${member.id}`} className="flex items-center gap-2 p-1.5 rounded-ind hover:bg-surface-inset transition-colors group">
                        <Avatar
                          name={displayName}
                          size="sm"
                          status={member.user.profile?.status}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                            <span className="truncate">{displayName}</span>
                            <span
                              className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={roleBadgeStyle(roleBadge.tone)}
                            >
                              {roleBadge.label}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted truncate">
                            {member.role?.name || member.user.username}
                          </div>
                        </div>
                        {canToggleRole && (
                          <button
                            onClick={() => handleRoleToggle(member.user.id, isAdminRole)}
                            disabled={isRoleActionLoading}
                            className="text-[10px] px-2 py-1 rounded-ind border transition-colors disabled:opacity-60"
                            style={{
                              color: 'var(--color-accent)',
                              borderColor: 'var(--color-accent)',
                              background: 'transparent',
                            }}
                            title={isAdminRole ? 'Demote to Member' : 'Promote to Admin'}
                          >
                            {isRoleActionLoading ? 'Saving...' : isAdminRole ? 'Demote' : 'Promote'}
                          </button>
                        )}
                        {canKickThisMember && (
                          <button
                            onClick={() => handleKick(member.user.id)}
                            disabled={isKickActionLoading}
                            className="text-[10px] px-2 py-1 rounded-ind border transition-colors disabled:opacity-60"
                            style={{
                              color: '#ff6b6b',
                              borderColor: '#ff6b6b',
                              background: 'transparent',
                            }}
                            title="Remove member"
                          >
                            {isKickActionLoading ? 'Removing...' : 'Kick'}
                          </button>
                        )}
                        {currentUser && !isSelf && (
                          <button
                            onClick={() => handleOpenDM(member.user.id)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-ind ind-button p-0 transition-opacity"
                            style={{ color: 'var(--color-accent)' }}
                            title={t('dm.sendMessage')}
                          >
                            <MessageSquare size={12} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {workspaceUsersFiltered.length === 0 && (
                    <div className="text-center py-3 text-xs text-muted">No workspace users</div>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[10px] uppercase tracking-wider px-1 mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  All Platform Users
                </div>
                <div className="space-y-1">
                  {platformUsersFiltered.map((workspaceUser) => {
                    const membership = members.find((m) => m.user.id === workspaceUser.id)
                    const displayName = workspaceUser.profile?.display_name || workspaceUser.username
                    const isSelf = currentUser?.id === workspaceUser.id
                    const roleBadge = membership ? resolveWorkspaceRole(membership.user.id, membership.role) : null

                    return (
                      <div key={`platform-${workspaceUser.id}`} className="flex items-center gap-2 p-1.5 rounded-ind hover:bg-surface-inset transition-colors group">
                        <Avatar
                          name={displayName}
                          size="sm"
                          status={workspaceUser.profile?.status}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)' }}>
                            <span className="truncate">{membership?.nickname || displayName}</span>
                            {roleBadge && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded-full"
                                style={roleBadgeStyle(roleBadge.tone)}
                              >
                                {roleBadge.label}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-muted truncate">
                            {membership?.role?.name || workspaceUser.username}
                          </div>
                        </div>
                        {currentUser && !isSelf && (
                          <button
                            onClick={() => handleOpenDM(workspaceUser.id)}
                            className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-ind ind-button p-0 transition-opacity"
                            style={{ color: 'var(--color-accent)' }}
                            title={t('dm.sendMessage')}
                          >
                            <MessageSquare size={12} />
                          </button>
                        )}
                        {canInviteMembers && !workspaceUser.is_member && !isSelf && (
                          <button
                            onClick={() => handleInvite(workspaceUser.id)}
                            disabled={invitingUserId === workspaceUser.id}
                            className="text-[10px] px-2 py-1 rounded-ind border transition-colors disabled:opacity-60"
                            style={{
                              color: 'var(--color-accent)',
                              borderColor: 'var(--color-accent)',
                              background: 'transparent',
                            }}
                          >
                            {invitingUserId === workspaceUser.id ? 'Inviting...' : 'Invite'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                  {platformUsersFiltered.length === 0 && (
                    <div className="text-center py-3 text-xs text-muted">No platform users</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Files */}
        {rightPanel === 'files' && (
          <div>
            {filesLoading ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 size={18} className="animate-spin" />
                <span className="ms-2 text-sm">Loading files...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full ind-recess flex items-center justify-center">
                  <File size={20} className="text-muted" />
                </div>
                <p className="text-sm text-muted">No files in this channel</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {files.map((f) => (
                  <FileItem key={f.id} file={f} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        {rightPanel === 'search' && (
          <div>
            <div className="flex gap-1 mb-3">
              <input
                type="text"
                className="ind-input text-xs"
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                dir="auto"
                style={{ unicodeBidi: 'plaintext' }}
              />
              <button onClick={handleSearch} className="ind-button !px-2 !py-1.5">
                <Search size={14} />
              </button>
            </div>
            <p className="text-[10px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Cmd/Ctrl+K to open - Enter to search - Esc to close
            </p>
            {searchLoading ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="space-y-2">
                {searchResults.map((msg) => (
                  <div key={msg.id} className="p-2 rounded-ind ind-recess text-xs">
                    <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {msg.user.profile?.display_name || msg.user.username}
                    </div>
                    <div className="text-muted mt-0.5" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{msg.content}</div>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full ind-recess flex items-center justify-center">
                  <Search size={20} className="text-muted" />
                </div>
                <p className="text-sm text-muted">No results found</p>
              </div>
            ) : null}
          </div>
        )}

        {/* Pinned */}
        {rightPanel === 'pinned' && (
          <div>
            {pinnedLoading ? (
              <div className="flex items-center justify-center py-8 text-muted">
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : pinnedMessages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-2 rounded-full ind-recess flex items-center justify-center">
                  <PinIcon size={20} className="text-muted" />
                </div>
                <p className="text-sm text-muted">No pinned messages</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pinnedMessages.map((pin) => (
                  <div key={pin.id} className="p-2.5 rounded-ind ind-recess text-xs" style={{ border: '1px solid var(--color-border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar
                        name={pin.message.user.profile?.display_name || pin.message.user.username}
                        size="sm"
                      />
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {pin.message.user.profile?.display_name || pin.message.user.username}
                      </span>
                    </div>
                    <p className="text-muted whitespace-pre-wrap" dir="auto" style={{ unicodeBidi: 'plaintext' }}>{pin.message.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
