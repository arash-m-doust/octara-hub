# Octara Hub — Fix Prompts for Claude Code (VSCode)

> هر بخش یک prompt مستقل است. آن‌ها را به ترتیب به Claude Code بدهید.

---

## PROMPT 1 — Mobile Message Actions (Long-press & Touch Support)

```
In the file `client/src/components/chat/MessageBubble.tsx`, the message action buttons (Reply, Edit, Delete, Pin, Reactions) are hidden behind `opacity-0 group-hover:opacity-100` which does not work on touch/mobile devices.

Fix this by:

1. Add a state `const [showActions, setShowActions] = useState(false)` to the MessageBubble component.

2. On the outer message container div, add:
   - `onTouchStart` handler that sets a 500ms long-press timer: `longPressTimer = setTimeout(() => setShowActions(true), 500)`
   - `onTouchEnd` / `onTouchMove` handlers that clear the timer to cancel if the user scrolls
   - `onClick` on mobile to toggle actions (detect via `('ontouchstart' in window)`)

3. Change the action bar div from:
   `className="opacity-0 group-hover:opacity-100 transition-opacity ..."`
   to:
   `className={`transition-opacity ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}`

4. Add a small persistent `···` (MoreHorizontal) button that is always visible on mobile (use `sm:hidden` to hide on desktop) which toggles `showActions`.

5. Add a click-outside listener using `useRef` on the message container so that `showActions` resets to false when the user taps elsewhere.

6. Also apply the same fix in `client/src/components/dm/DMChatView.tsx` — messages there use `MessageBubble` so it should be covered automatically, but verify.

Do not change desktop hover behavior. The fix is additive — mobile gets long-press/persistent button, desktop keeps hover.
```

---

## PROMPT 2 — Video Call Layout: Responsive Grid & Local Video Fix

```
In the file `client/src/components/call/CallOverlay.tsx`, there are two layout bugs:

**Bug 1 — Remote video fixed pixel size:**
The `RemoteVideo` component uses hardcoded `width: 320, height: 240` which overflows on small screens.

Replace the container in `RemoteVideo` with:
```tsx
<div
  className="relative rounded-lg overflow-hidden"
  style={{
    width: '100%',
    maxWidth: 480,
    aspectRatio: '4/3',
    border: '2px solid var(--color-border)',
    boxShadow: '0 4px 12px var(--color-metal-shadow)',
  }}
>
```

And change the video area wrapper (the div wrapping remote streams) from a plain flex div to:
```tsx
<div
  style={{
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    justifyItems: 'center',
  }}
>
```

**Bug 2 — Local video overlay uses invalid Tailwind class `h-30`:**
Find:
```tsx
className="absolute bottom-4 end-4 w-40 h-30 rounded-lg overflow-hidden"
```
Replace with:
```tsx
className="absolute bottom-4 end-4 w-40 rounded-lg overflow-hidden"
style={{ height: 120 }}
```
(Tailwind does not have `h-30` — valid steps are h-28=112px, h-32=128px. Use inline style `height: 120` instead.)

**Bug 3 — Minimized overlay on small screens:**
The minimized call bar uses `fixed bottom-4 end-4` which can overlap content. Add `z-50` and ensure it doesn't cover the message input by adding `bottom-20 md:bottom-4`.
```

---

## PROMPT 3 — SSE Performance: Replace Busy-Loop with Blocking Queue

```
In the file `server/realtime/views.py`, the `event_stream` generator function uses a busy polling loop with `time.sleep(3)` inside a `while True`. This wastes CPU because every active connection wakes up every 3 seconds even when there is no data.

Replace the entire `event_stream` inner function with this blocking implementation:

```python
def event_stream():
    import queue as q_module
    try:
        yield f"data: {json.dumps({'type': 'connected', 'channels': channels})}\n\n"

        while True:
            event = None
            # Block up to 15 seconds waiting for an event from ANY subscribed queue
            deadline = time.time() + 15
            while time.time() < deadline:
                remaining = deadline - time.time()
                for ch, q in queues.items():
                    try:
                        event = q.get(timeout=min(0.05, remaining))
                        break
                    except q_module.Empty:
                        continue
                if event:
                    break

            if event:
                yield f"data: {json.dumps(event)}\n\n"
            else:
                # Send heartbeat after 15s of silence
                yield f": heartbeat {int(time.time())}\n\n"
    finally:
        for ch, q in queues.items():
            unsubscribe(ch, q)
```

Also add this import at the top of the file if not already present:
```python
import queue as std_queue
```

This change reduces CPU usage from O(connections × poll_frequency) to near zero when there is no activity, and ensures events are delivered within ~50ms instead of up to 3 seconds.
```

---

## PROMPT 4 — Fix Reaction Update: Local Optimistic Update Instead of Full Refetch

```
In the file `client/src/stores/messageStore.ts`, the `addReaction` method currently refetches the entire message list after adding a reaction:

```ts
// CURRENT (bad) — fetches ALL messages again just to update reaction counts
const res = await messageApi.list(channelId)
set({ messages: res.results.reverse() })
```

Replace the entire `addReaction` method with an optimistic local update:

```ts
addReaction: async (channelId, messageId, emoji) => {
  // Optimistic update first
  set((s) => ({
    messages: s.messages.map((m) => {
      if (m.id !== messageId) return m
      const existing = m.reactions.find((r) => r.emoji === emoji)
      if (existing) {
        return {
          ...m,
          reactions: m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          ),
        }
      }
      return {
        ...m,
        reactions: [...m.reactions, { emoji, count: 1, reacted: true }],
      }
    }),
  }))
  try {
    await messageApi.addReaction(channelId, messageId, emoji)
  } catch (err) {
    // Rollback on error
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== messageId) return m
        return {
          ...m,
          reactions: m.reactions
            .map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r)
            .filter((r) => r.count > 0),
        }
      }),
    }))
    throw err
  }
},
```

Also update `removeReaction` the same way:

```ts
removeReaction: async (channelId, messageId, emoji) => {
  set((s) => ({
    messages: s.messages.map((m) => {
      if (m.id !== messageId) return m
      return {
        ...m,
        reactions: m.reactions
          .map((r) => r.emoji === emoji ? { ...r, count: r.count - 1, reacted: false } : r)
          .filter((r) => r.count > 0),
      }
    }),
  }))
  try {
    await messageApi.removeReaction(channelId, messageId, emoji)
  } catch (err) {
    // Rollback
    set((s) => ({
      messages: s.messages.map((m) => {
        if (m.id !== messageId) return m
        return {
          ...m,
          reactions: m.reactions.map((r) =>
            r.emoji === emoji ? { ...r, count: r.count + 1, reacted: true } : r
          ),
        }
      }),
    }))
    throw err
  }
},
```
```

---

## PROMPT 5 — Load More / Infinite Scroll for Message History

```
In the file `client/src/components/chat/MessageList.tsx`, the `loadMore` function exists in `messageStore` but is never called. Implement infinite scroll to load older messages when the user scrolls to the top.

1. Add an `IntersectionObserver` on the top sentinel element:

```tsx
import { useRef, useEffect, useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/workspaceStore'

export function MessageList() {
  const { messages, isLoading, hasMore, loadMore } = useMessageStore()
  const { currentChannel } = useWorkspaceStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const topRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const prevScrollHeight = useRef<number>(0)

  // Preserve scroll position when older messages load
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const newScrollHeight = container.scrollHeight
    if (prevScrollHeight.current > 0) {
      container.scrollTop = newScrollHeight - prevScrollHeight.current
    }
    prevScrollHeight.current = 0
  }, [messages.length])

  // Intersection observer for top of list
  useEffect(() => {
    const sentinel = topRef.current
    const container = containerRef.current
    if (!sentinel || !currentChannel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          prevScrollHeight.current = container?.scrollHeight ?? 0
          loadMore(currentChannel.id)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [currentChannel?.id, hasMore, isLoading, loadMore])

  // Auto-scroll to bottom only when near bottom
  const [isNearBottom, setIsNearBottom] = useState(true)
  
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 120)
  }, [])

  useEffect(() => {
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length, isNearBottom])

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5"
    >
      {/* Top sentinel for infinite scroll */}
      <div ref={topRef} />
      
      {isLoading && hasMore && (
        <div className="flex justify-center py-2">
          <Loader2 size={16} className="animate-spin text-muted" />
        </div>
      )}
      
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

2. Also add a "scroll to bottom" floating button that appears when `isNearBottom` is false and a new message arrives. Place it absolutely positioned at `bottom-4 right-4` inside the message list container.
```

---

## PROMPT 6 — Typing Indicator: Frontend Implementation

```
The backend already has a working typing endpoint at `POST /api/channels/{channel_id}/typing/` and publishes `typing.start` SSE events. The frontend has `messageApi.typing()` defined but never calls it, and there is no UI to show when someone is typing.

**Step 1 — Call typing API when user types:**
In `client/src/components/chat/MessageInput.tsx`, add a debounced typing indicator call:

```tsx
import { useRef } from 'react'

// Inside the component, add:
const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
  setContent(e.target.value)
  
  if (currentChannel) {
    // Debounce: send typing event max once per 2 seconds
    if (!typingTimer.current) {
      messageApi.typing(currentChannel.id).catch(() => {})
    }
    if (typingTimer.current) clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null
    }, 2000)
  }
}

// Replace onChange on textarea:
onChange={(e) => handleContentChange(e)}
```

**Step 2 — Show typing indicator in ChatView:**
In `client/src/components/chat/ChatView.tsx`, add typing state and SSE listener:

```tsx
const [typingUsers, setTypingUsers] = useState<{userId: number, username: string, expiresAt: number}[]>([])

// Inside the useEffect for realtime events, add:
realtime.on('typing.start', (data: unknown) => {
  const { user_id, username } = data as { user_id: number; username: string }
  if (user_id === currentUser?.id) return // don't show own typing
  
  setTypingUsers((prev) => {
    const filtered = prev.filter((u) => u.userId !== user_id)
    return [...filtered, { userId: user_id, username, expiresAt: Date.now() + 3000 }]
  })
  
  // Auto-remove after 3 seconds
  setTimeout(() => {
    setTypingUsers((prev) => prev.filter((u) => u.expiresAt > Date.now()))
  }, 3100)
})
```

**Step 3 — Render typing indicator above MessageInput:**
Add this just before `<MessageInput ...>` in ChatView:

```tsx
{typingUsers.length > 0 && (
  <div className="px-4 pb-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
    <span className="animate-pulse">●●●</span>
    {' '}
    {typingUsers.map((u) => u.username).join(', ')}
    {' '}{typingUsers.length === 1 ? 'is' : 'are'} typing...
  </div>
)}
```

Apply the same pattern in `client/src/components/dm/DMChatView.tsx` for DM threads using the `dm_{threadId}` SSE channel. The DM backend doesn't have a dedicated typing endpoint, so for DM typing just use the SSE approach without the API call (or add the endpoint later).
```

---

## PROMPT 7 — Notification System: Bell Icon + Badge + Panel

```
The backend has a complete Notification model, serializer, and API at `/api/notifications/`. The frontend has NO notification UI at all. Build a notification system.

**Step 1 — Create notification store** at `client/src/stores/notificationStore.ts`:

```ts
import { create } from 'zustand'
import { api } from '@/api/client'
import { extractResults } from '@/api/client'

interface Notification {
  id: number
  type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markRead: (id: number) => Promise<void>
  markAllRead: () => Promise<void>
  addNotification: (n: Notification) => void
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  fetchNotifications: async () => {
    try {
      const res = await api<Notification[]>('/notifications/')
      const list = extractResults(res)
      set({ notifications: list, unreadCount: list.filter((n) => !n.is_read).length })
    } catch {}
  },
  
  markRead: async (id) => {
    await api(`/notifications/${id}/read/`, { method: 'POST' })
    set((s) => ({
      notifications: s.notifications.map((n) => n.id === id ? { ...n, is_read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - 1),
    }))
  },
  
  markAllRead: async () => {
    await api('/notifications/read-all/', { method: 'POST' })
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }))
  },
  
  addNotification: (n) => set((s) => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
}))
```

**Step 2 — Add Bell button in TopBar** (`client/src/components/layout/TopBar.tsx`):

Import `Bell` from lucide-react and add `useNotificationStore`. Add this button in the "Right Controls" div (before Settings button):

```tsx
const { unreadCount, fetchNotifications } = useNotificationStore()

// In JSX, before the Settings button:
<div className="relative">
  <button
    onClick={() => setShowNotifications(!showNotifications)}
    className="w-8 h-8 flex items-center justify-center rounded-ind ind-button p-0"
    title="Notifications"
    aria-label="Notifications"
  >
    <Bell size={14} className="text-muted" />
    {unreadCount > 0 && (
      <span
        className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center"
        style={{ backgroundColor: '#FF5252' }}
      >
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </button>
</div>
```

**Step 3 — Fetch notifications on login** in `AppShell.tsx`:
In the `useEffect` that calls `fetchWorkspaces()`, also call `useNotificationStore.getState().fetchNotifications()`.

**Step 4 — Listen for notification SSE events** in `AppShell.tsx`:
In the realtime effects block, add:
```ts
realtime.on('notification', (data: unknown) => {
  const { notification } = data as { notification: Notification }
  useNotificationStore.getState().addNotification(notification)
})
```
```

---

## PROMPT 8 — RTL Fix: Replace All Directional Margin/Padding Classes

```
The project supports RTL (Farsi/Arabic) but uses non-logical CSS classes in several places. Fix all occurrences of directional classes that don't auto-flip in RTL mode.

Search the entire `client/src/` directory and replace:

| Find | Replace | Reason |
|------|---------|--------|
| `mr-` | `me-` | margin-right → margin-inline-end |
| `ml-` | `ms-` | margin-left → margin-inline-start |
| `pl-` | `ps-` | padding-left → padding-inline-start |
| `pr-` | `pe-` | padding-right → padding-inline-end |
| `left-` | `start-` | position left → inset-inline-start |
| `right-` | `end-` | position right → inset-inline-end |
| `text-left` | `text-start` | text alignment |
| `text-right` | `text-end` | text alignment |
| `border-l-` | `border-s-` | border left |
| `border-r-` | `border-e-` | border right |
| `rounded-l-` | `rounded-s-` | border radius left side |
| `rounded-r-` | `rounded-e-` | border radius right side |

**Specific known locations to fix immediately:**
1. `client/src/components/dm/DMChatView.tsx` line with `mr-2` → `me-2`
2. `client/src/components/chat/MessageBubble.tsx` — any `pl-3`/`pr-3` → `ps-3`/`pe-3`
3. `client/src/components/layout/ChannelSidebar.tsx` — check all directional classes
4. `client/src/components/chat/MessageInput.tsx` — the reply indicator uses `border-left` inline style → change to `borderInlineStart`

After replacement, do NOT change:
- Classes inside `style={{ }}` that already use logical properties (borderInlineStart, etc.)
- Animation transforms that are inherently directional (translateX for specific motion)
- The `dir="ltr"` attribute on the HTML element — that is controlled programmatically
```

---

## PROMPT 9 — Toast Notification System for Error Handling

```
Currently, almost all API errors in the codebase are silently swallowed with `console.error()` or at best shown in a local `<p className="text-xs text-error">` that the user may never see. Build a global toast notification system.

**Step 1 — Create `client/src/components/ui/Toast.tsx`:**

```tsx
import { useState, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  add: (message: string, type?: Toast['type'], duration?: number) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (message, type = 'info', duration = 4000) => {
    const id = `${Date.now()}-${Math.random()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

export const toast = {
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  error: (msg: string) => useToastStore.getState().add(msg, 'error', 6000),
  info: (msg: string) => useToastStore.getState().add(msg, 'info'),
}

const icons = { success: CheckCircle, error: AlertCircle, info: Info }
const colors = {
  success: { bg: 'rgba(0,230,118,0.1)', border: 'rgba(0,230,118,0.3)', color: 'var(--color-led-online)' },
  error: { bg: 'rgba(255,82,82,0.1)', border: 'rgba(255,82,82,0.3)', color: '#FF5252' },
  info: { bg: 'var(--color-accent-soft)', border: 'var(--color-accent)', color: 'var(--color-accent)' },
}

export function ToastContainer() {
  const { toasts, remove } = useToastStore()
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
      }}
    >
      {toasts.map((t) => {
        const Icon = icons[t.type]
        const c = colors[t.type]
        return (
          <div
            key={t.id}
            style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 8, padding: '10px 14px',
              display: 'flex', alignItems: 'flex-start', gap: 10,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideIn .2s ease',
            }}
          >
            <Icon size={16} style={{ color: c.color, flexShrink: 0, marginTop: 1 }} />
            <span style={{ flex: 1, fontSize: 13, color: 'var(--color-text-primary)', lineHeight: 1.5 }}>
              {t.message}
            </span>
            <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--color-text-muted)' }}>
              <X size={14} />
            </button>
          </div>
        )
      })}
      <style>{`@keyframes slideIn { from { transform: translateX(20px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  )
}
```

**Step 2 — Add ToastContainer to AppShell:**
In `client/src/components/layout/AppShell.tsx`, import `ToastContainer` and add it at the end of the returned JSX (after `<IncomingCallModal />`):
```tsx
<ToastContainer />
```

**Step 3 — Replace console.error calls with toast.error:**
In these files, replace silent failures with toast notifications:

- `client/src/components/chat/MessageInput.tsx`: change `setError('Failed to send message')` to also call `toast.error('Failed to send message')`
- `client/src/components/layout/ChannelSidebar.tsx`: replace the `setError(msg)` on createChannel/createCategory with `toast.error(msg)` (and still show inline error in modal)
- `client/src/stores/workspaceStore.ts`: in `fetchWorkspaces` catch block add `toast.error('Failed to load workspaces')`
- `client/src/stores/dmStore.ts`: in `sendMessage` catch block add `toast.error('Message failed to send')`
- `client/src/components/call/CallOverlay.tsx`: the `mediaError` state can now use `toast.error(msg)` and optionally keep the existing inline display too

Export `toast` from `client/src/components/ui/Toast.tsx` so it can be used anywhere without hooks.
```

---

## PROMPT 10 — Accessibility: ARIA Labels, Focus Trap, Keyboard Navigation

```
Fix three critical accessibility issues across the codebase.

**Fix 1 — Add aria-label to all icon-only buttons:**

In `client/src/components/layout/TopBar.tsx`, add `aria-label` to every button that has only an icon:
- Settings button: `aria-label="Open settings"`
- Logout button: `aria-label="Log out"`
- Add workspace button: `aria-label="Create new workspace"`
- Mobile hamburger: `aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}`

In `client/src/components/layout/ChatView.tsx`, add `aria-label` to:
- Pin button: `aria-label="View pinned messages"`
- Users button: `aria-label="View members"`
- Files button: `aria-label="Browse files"`
- Search button: `aria-label="Search messages"`

In `client/src/components/chat/MessageBubble.tsx`, add `aria-label` to quick reaction buttons:
```tsx
<button aria-label={`React with ${emoji}`} ...>
```

In `client/src/components/ui/Avatar.tsx`, add status to the LED indicator:
```tsx
<span
  className={...}
  role="img"
  aria-label={`Status: ${status}`}
  ...
/>
```

**Fix 2 — Focus trap in Modal:**
In `client/src/components/ui/Modal.tsx`, add focus trap and focus return:

```tsx
import { useEffect, useRef } from 'react'

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement
      // Focus first focusable element
      setTimeout(() => {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        focusable?.[0]?.focus()
      }, 10)
    } else {
      previousFocus.current?.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const focusable = Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div ref={modalRef} className={`relative w-full ${sizeClasses[size]} ind-panel-raised p-6`} ...>
        <div className="flex items-center justify-between mb-4 pb-3" ...>
          <h2 id="modal-title" className="text-lg font-semibold tracking-wide" ...>{title}</h2>
          ...
        </div>
        {children}
      </div>
    </div>
  )
}
```

**Fix 3 — Add role and keyboard navigation to MessageList:**
In `client/src/components/chat/MessageList.tsx`, wrap the list in a semantic element:
```tsx
<div
  ref={containerRef}
  role="log"
  aria-label="Message history"
  aria-live="polite"
  aria-relevant="additions"
  className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5"
>
```
```

---

## PROMPT 11 — SSE Connection Status Indicator

```
In `client/src/components/layout/StatusBar.tsx`, the connection status always shows "Connected" even when the SSE is reconnecting after a disconnect.

**Step 1 — Expose connection state from realtime connection:**
In `client/src/realtime/connection.ts`, add a connection state and listener system:

```ts
type ConnectionState = 'connected' | 'disconnected' | 'reconnecting'

class RealtimeConnection {
  private state: ConnectionState = 'disconnected'
  private stateListeners: Set<(state: ConnectionState) => void> = new Set()

  onStateChange(listener: (state: ConnectionState) => void) {
    this.stateListeners.add(listener)
    return () => this.stateListeners.delete(listener)
  }

  private setState(state: ConnectionState) {
    this.state = state
    this.stateListeners.forEach((l) => l(state))
  }

  getState() { return this.state }

  connect() {
    // ... existing connect code ...
    this.setState('reconnecting') // add before creating EventSource
    
    this.eventSource.onopen = () => {
      this.reconnectDelay = 1000
      this.setState('connected') // add here
    }
    
    this.eventSource.onerror = () => {
      this.eventSource?.close()
      this.eventSource = null
      this.setState('disconnected') // add here
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    this.setState('reconnecting') // add here
    this.reconnectTimer = setTimeout(() => { ... }, this.reconnectDelay)
  }
}
```

**Step 2 — Update StatusBar to react to connection state:**
In `client/src/components/layout/StatusBar.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { realtime } from '@/realtime/connection'

export function StatusBar() {
  const [connState, setConnState] = useState(realtime.getState())
  
  useEffect(() => {
    return realtime.onStateChange(setConnState)
  }, [])

  const stateConfig = {
    connected: { color: 'var(--color-led-online)', label: 'Connected' },
    reconnecting: { color: 'var(--color-led-idle)', label: 'Reconnecting…', pulse: true },
    disconnected: { color: 'var(--color-led-dnd)', label: 'Disconnected' },
  }
  const cfg = stateConfig[connState]

  // In JSX, replace the hardcoded "Connected" section with:
  return (
    ...
    <div className="flex items-center gap-1.5">
      <span
        className={`ind-led ${cfg.pulse ? 'ind-led-pulse' : 'ind-led-on'}`}
        style={{ backgroundColor: cfg.color, width: '6px', height: '6px' }}
      />
      <Wifi size={10} />
      <span>{cfg.label}</span>
    </div>
    ...
  )
}
```
```

---

## PROMPT 12 — Mobile Responsive: Right Panel as Bottom Sheet

```
The Right Panel (Members, Files, Pinned, Search) is completely hidden on mobile with `hidden md:flex`. On mobile devices, users have no access to these features at all.

**In `client/src/components/layout/AppShell.tsx`**, change the right panel rendering to show a bottom sheet on mobile:

```tsx
{rightPanel && (
  <>
    {/* Desktop: side panel */}
    <div
      className="hidden md:flex"
      onMouseDown={(event) => startResize('right', event)}
      ...
    />
    <div className="hidden md:flex flex-shrink-0" style={{ width: `${rightPanelWidth}px` }}>
      <RightPanel width={rightPanelWidth} />
    </div>

    {/* Mobile: bottom sheet */}
    <div className="md:hidden fixed inset-0 z-40 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/40"
        onClick={() => setRightPanel(null)}
      />
      {/* Sheet */}
      <div
        className="rounded-t-xl overflow-hidden"
        style={{
          background: 'var(--color-surface-plate)',
          maxHeight: '75vh',
          border: '1px solid var(--color-border)',
          borderBottom: 'none',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div
            style={{
              width: 40, height: 4, borderRadius: 2,
              background: 'var(--color-border)',
            }}
          />
        </div>
        <div style={{ maxHeight: 'calc(75vh - 20px)', overflowY: 'auto' }}>
          <RightPanel width={window.innerWidth} />
        </div>
      </div>
    </div>
  </>
)}
```

Also in the ChatView header, ensure the icon buttons that open the right panel work on mobile — they already have `onClick={() => toggleRightPanel(...)}` so that part is fine.
```

---

## PROMPT 13 — Fix Light Theme Contrast (WCAG AA Compliance)

```
In `client/src/styles/globals.css`, the light theme has a text contrast issue. The `--color-text-muted` value `#6e6e78` on `--color-surface` background `#c8c8cc` produces approximately a 2.1:1 contrast ratio, which fails WCAG AA (minimum 4.5:1 for normal text).

Update the light theme `:root` CSS variables to fix contrast:

```css
:root {
  /* Darken the muted text color to pass WCAG AA on the surface background */
  --color-text-muted: #4a4a54;    /* was #6e6e78 — now ~4.6:1 on #c8c8cc */
  --color-text-secondary: #2e2e36; /* was #4a4a52 — improve secondary contrast too */
  
  /* Lighten the surfaces slightly to help contrast across the board */
  --color-surface: #cacacf;          /* was #c8c8cc */
  --color-surface-raised: #d8d8dc;   /* was #d6d6da */
  --color-surface-inset: #b4b4ba;    /* was #b0b0b6 */
  --color-surface-plate: #c4c4c9;    /* was #bfc0c5 */
}
```

Also in `client/src/styles/globals.css`, add a CSS rule to ensure the `ind-label` class (used heavily in sidebars) meets minimum contrast in light mode:

```css
@layer components {
  /* Ensure ind-label passes WCAG AA in light theme */
  :root .ind-label {
    color: var(--color-text-secondary);
  }
}
```

After making this change, verify visually that:
1. Channel names in the sidebar are clearly readable
2. Message timestamps are readable
3. The "ind-label" uppercase section headers are readable
4. The metal/industrial styling is preserved (just with higher contrast text)
```

---

## PROMPT 14 — Workspace Leave Option for Regular Members

```
Currently there is no way for a regular workspace member to leave a workspace. Only admins can kick members. Add a "Leave Workspace" option.

**Backend — add leave endpoint:**
In `server/apps/workspaces/urls.py`, add:
```python
path('<int:workspace_id>/leave/', views.LeaveWorkspaceView.as_view(), name='workspace_leave'),
```

In `server/apps/workspaces/views.py`, add the view:
```python
class LeaveWorkspaceView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, workspace_id):
        try:
            member = WorkspaceMember.objects.get(
                workspace_id=workspace_id, user=request.user
            )
        except WorkspaceMember.DoesNotExist:
            return Response({'detail': 'Not a member.'}, status=404)
        
        if member.workspace.owner_id == request.user.id:
            return Response({'detail': 'Owner cannot leave. Transfer ownership first.'}, status=400)
        
        member.delete()
        return Response(status=204)
```

**Frontend — add to workspace API:**
In `client/src/api/workspaces.ts`, add to `workspaceApi`:
```ts
leave: (id: number) => api(`/workspaces/${id}/leave/`, { method: 'POST' }),
```

**Frontend — add Leave button in TopBar:**
In `client/src/components/layout/TopBar.tsx`, add a dropdown or context menu on the active workspace tab. For simplicity, add a "Leave" option that appears in a small dropdown when the user right-clicks or clicks a `···` chevron next to the workspace name:

Add this in the workspace tab button area (only show for non-owner members):
```tsx
{!ws.is_owner && isActive && (
  <button
    onClick={async (e) => {
      e.stopPropagation()
      if (!confirm(`Leave "${ws.name}"?`)) return
      await workspaceApi.leave(ws.id)
      await fetchWorkspaces()
      if (workspaces.length > 0) setCurrentWorkspace(workspaces[0])
      else setView('workspace')
    }}
    className="ms-1 w-4 h-4 flex items-center justify-center rounded text-muted hover:text-error"
    title="Leave workspace"
    aria-label="Leave workspace"
  >
    <LogOut size={10} />
  </button>
)}
```
```

---

## PROMPT 15 — Global Keyboard Shortcut: Cmd+K Search

```
Currently there is no keyboard shortcut to open search. Add a global Cmd+K (Mac) / Ctrl+K (Windows/Linux) shortcut.

**In `client/src/components/layout/AppShell.tsx`**, add a global keydown listener:

```tsx
useEffect(() => {
  const handleGlobalKey = (e: KeyboardEvent) => {
    const isMac = navigator.platform.includes('Mac')
    const modifier = isMac ? e.metaKey : e.ctrlKey

    // Cmd/Ctrl + K — open search
    if (modifier && e.key === 'k') {
      e.preventDefault()
      useUIStore.getState().toggleRightPanel('search')
      // Focus the search input after a tick
      setTimeout(() => {
        const searchInput = document.querySelector<HTMLInputElement>('[placeholder="Search messages..."]')
        searchInput?.focus()
      }, 50)
    }

    // Escape — close right panel
    if (e.key === 'Escape') {
      const { rightPanel, setRightPanel } = useUIStore.getState()
      if (rightPanel) setRightPanel(null)
    }
  }

  window.addEventListener('keydown', handleGlobalKey)
  return () => window.removeEventListener('keydown', handleGlobalKey)
}, [])
```

**In `client/src/components/layout/ChatView.tsx`**, update the Search button tooltip to show the shortcut:

```tsx
<button
  onClick={() => toggleRightPanel('search')}
  className="w-7 h-7 flex items-center justify-center rounded-ind ind-button p-0 text-muted"
  title="Search (⌘K)"
  aria-label="Search messages (Command K)"
>
  <Search size={14} />
</button>
```

**In `client/src/components/layout/RightPanel.tsx`**, when `rightPanel === 'search'` opens, auto-focus the search input:

```tsx
useEffect(() => {
  if (rightPanel === 'search') {
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>('[placeholder="Search messages..."]')
      input?.focus()
    }, 50)
  }
}, [rightPanel])
```

Also add a small hint text below the search input showing: `⌘K to open • Enter to search • Esc to close`
```

---

## PROMPT 16 — File Upload: Drag-and-Drop & Paste Support

```
In `client/src/components/chat/MessageInput.tsx`, file upload currently only works via a file picker button. Add drag-and-drop and clipboard paste support.

Replace the MessageInput component with this enhanced version (keep all existing logic, just add these handlers):

```tsx
// Add these state and ref additions at the top of the component
const [isDragging, setIsDragging] = useState(false)

// Add drag handlers on the outer container div
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(true)
}
const handleDragLeave = () => setIsDragging(false)
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault()
  setIsDragging(false)
  const file = e.dataTransfer.files[0]
  if (file) await uploadFile(file)
}

// Extract upload logic into a reusable function
const uploadFile = async (file: File) => {
  if (!currentChannel) return
  if (file.size > 52428800) { // 50MB
    setError('File too large. Maximum size is 50MB.')
    return
  }
  setUploading(true)
  setError('')
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('channel_id', String(currentChannel.id))
    await fileApi.upload(formData)
    await fetchMessages(currentChannel.id)
  } catch (err) {
    setError('Failed to upload file')
  } finally {
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }
}

// Add paste handler on the textarea
const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
  const items = Array.from(e.clipboardData.items)
  const imageItem = items.find((item) => item.type.startsWith('image/'))
  if (imageItem) {
    e.preventDefault()
    const file = imageItem.getAsFile()
    if (file) await uploadFile(file)
  }
  // Non-image paste falls through to normal textarea behavior
}

// In the JSX, update the outer container div:
<div
  className={`flex-shrink-0 px-4 pb-3 ${isDragging ? 'opacity-80' : ''}`}
  onDragOver={handleDragOver}
  onDragLeave={handleDragLeave}
  onDrop={handleDrop}
>
  {isDragging && (
    <div
      className="absolute inset-0 flex items-center justify-center z-10 rounded-ind-lg"
      style={{
        background: 'var(--color-accent-soft)',
        border: '2px dashed var(--color-accent)',
        borderRadius: 8,
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: 'var(--color-accent)', fontSize: 14 }}>Drop file to upload</span>
    </div>
  )}
  {/* ... rest of existing JSX ... */}
  <textarea
    ...
    onPaste={handlePaste}
  />
```

Update `handleFileUpload` to call `uploadFile(file)` instead of duplicating logic.
```

---

## PROMPT 17 — Password Strength Indicator in RegisterForm

```
In `client/src/components/auth/RegisterForm.tsx`, add a password strength indicator below the password field.

Add this helper function and component inside the file:

```tsx
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: 'var(--color-border)' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  
  if (score <= 1) return { score, label: 'Weak', color: '#FF5252' }
  if (score <= 2) return { score, label: 'Fair', color: 'var(--color-led-idle)' }
  if (score <= 3) return { score, label: 'Good', color: 'var(--color-accent)' }
  return { score, label: 'Strong', color: 'var(--color-led-online)' }
}
```

Then add this JSX block directly after the password `<Input>` field and before the confirm password field:

```tsx
{form.password && (() => {
  const strength = getPasswordStrength(form.password)
  return (
    <div style={{ marginTop: -8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= strength.score ? strength.color : 'var(--color-border)',
              transition: 'background .3s',
            }}
          />
        ))}
      </div>
      <p style={{ fontSize: 11, color: strength.color }}>{strength.label}</p>
    </div>
  )
})()}
```

This gives instant visual feedback to the user before they attempt to submit.
```

---

## PROMPT 18 — Reply Click: Scroll to Original Message

```
In `client/src/components/chat/MessageBubble.tsx`, the `reply_to_preview` section shows a quoted preview but clicking on it does nothing. Add scroll-to-original-message behavior.

**Step 1 — Add message IDs to DOM elements in MessageList:**
In `client/src/components/chat/MessageList.tsx`, add a `data-message-id` attribute to each MessageBubble wrapper. Since MessageBubble renders a `<div>`, add the ID in MessageList:

```tsx
{messages.map((msg) => (
  <div key={msg.id} data-message-id={msg.id}>
    <MessageBubble message={msg} />
  </div>
))}
```

**Step 2 — Add click handler to reply preview in MessageBubble:**

Find the reply_to_preview block in `MessageBubble.tsx` and make it clickable:

```tsx
{message.reply_to_preview && (
  <div
    className={`mt-0.5 text-xs cursor-pointer hover:opacity-80 transition-opacity ${isOwn ? 'pe-3 text-end' : 'ps-3 text-start'}`}
    style={{
      borderInlineStart: !isOwn ? '2px solid var(--color-accent)' : undefined,
      borderInlineEnd: isOwn ? '2px solid var(--color-accent)' : undefined,
      color: 'var(--color-text-muted)',
    }}
    onClick={() => {
      const target = document.querySelector(`[data-message-id="${message.reply_to_preview!.id}"]`)
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Briefly highlight the target message
        target.classList.add('ring-2')
        target.setAttribute('style', 'background: var(--color-accent-soft); border-radius: 6px; transition: background 1s')
        setTimeout(() => {
          target.removeAttribute('style')
          target.classList.remove('ring-2')
        }, 1500)
      }
    }}
    title="Click to jump to original message"
  >
    <span style={{ color: 'var(--color-accent)', fontWeight: 500 }}>
      {message.reply_to_preview.user.profile?.display_name || message.reply_to_preview.user.username}
    </span>
    {': '}
    {message.reply_to_preview.content}
  </div>
)}
```
```

---

## PROMPT 19 — Unread Count Badge on Workspace Tabs

```
In `client/src/components/layout/TopBar.tsx`, the workspace tabs show no unread indicator. When there are unread messages in a workspace, the tab should show a badge.

**Step 1 — Compute unread count per workspace:**
In the workspace tab rendering loop, compute the unread count from the `channels` in the workspaceStore. However, since we only have channels for the *current* workspace loaded, we need to use the workspace's channel data smartly.

Add a function to get unread count for a workspace:

```tsx
// Add inside TopBar component
const getWorkspaceUnread = (wsId: number) => {
  if (currentWorkspace?.id !== wsId) return 0 // only know current workspace's data
  return channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0)
}
```

**Step 2 — Add badge to workspace tab:**
In the workspace tab button JSX, add:

```tsx
<button
  key={ws.id}
  onClick={() => { setCurrentWorkspace(ws); setView('workspace') }}
  className="h-8 px-3 flex items-center gap-1.5 rounded-ind text-xs font-semibold transition-all flex-shrink-0 relative"
  ...
>
  {/* existing icon and name */}
  
  {/* Unread badge */}
  {getWorkspaceUnread(ws.id) > 0 && !isActive && (
    <span
      className="absolute -top-1 -end-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
      style={{ backgroundColor: '#FF5252', boxShadow: '0 0 4px rgba(255,82,82,0.5)' }}
    >
      {getWorkspaceUnread(ws.id) > 9 ? '9+' : getWorkspaceUnread(ws.id)}
    </span>
  )}
  
  {/* Active LED indicator — existing code */}
  {isActive && (
    <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" .../>
  )}
</button>
```

Also add unread badge to the DM button in TopBar. Import `useDMStore` and compute:
```tsx
const totalDmUnread = threads.reduce((sum, t) => sum + (t.unread_count || 0), 0)

// On the DM button:
{totalDmUnread > 0 && (
  <span className="absolute -top-1 -end-1 min-w-[14px] h-[14px] rounded-full text-[9px] font-bold text-white flex items-center justify-center"
    style={{ backgroundColor: '#FF5252' }}
  >
    {totalDmUnread > 9 ? '9+' : totalDmUnread}
  </span>
)}
```
```

---

## PROMPT 20 — Scroll-to-Bottom Button with New Message Count

```
In `client/src/components/chat/MessageList.tsx`, add a floating "scroll to bottom" button that appears when the user has scrolled up and new messages arrive.

This is related to Prompt 5 (Load More) — if you've already applied that prompt, add to the existing component. If not, apply these changes:

```tsx
import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export function MessageList() {
  const { messages, isLoading } = useMessageStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNearBottom, setIsNearBottom] = useState(true)
  const [newMessageCount, setNewMessageCount] = useState(0)
  const prevMessageCount = useRef(messages.length)

  const handleScroll = () => {
    const container = containerRef.current
    if (!container) return
    const { scrollTop, scrollHeight, clientHeight } = container
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100
    setIsNearBottom(nearBottom)
    if (nearBottom) setNewMessageCount(0)
  }

  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newCount = messages.length - prevMessageCount.current
      if (!isNearBottom) {
        setNewMessageCount((c) => c + newCount)
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    }
    prevMessageCount.current = messages.length
  }, [messages.length, isNearBottom])

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setNewMessageCount(0)
  }

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-0.5"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-muted" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('chat.noMessages')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} data-message-id={msg.id}>
              <MessageBubble message={msg} />
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom button */}
      {!isNearBottom && (
        <button
          onClick={scrollToBottom}
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 20,
            background: 'var(--color-surface-raised)',
            border: '1px solid var(--color-accent)',
            boxShadow: '0 2px 8px var(--color-metal-shadow), 0 0 8px var(--color-accent-glow)',
            color: 'var(--color-accent)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            zIndex: 10,
          }}
        >
          <ChevronDown size={14} />
          {newMessageCount > 0 ? `${newMessageCount} new message${newMessageCount > 1 ? 's' : ''}` : 'Jump to bottom'}
        </button>
      )}
    </div>
  )
}
```
```

---

> **ترتیب اجرای پیشنهادی:**
> 1. Prompt 2 (Video bug — فوری)
> 2. Prompt 3 (SSE CPU — فوری)
> 3. Prompt 4 (Reaction refetch — فوری)
> 4. Prompt 1 (Mobile touch)
> 5. Prompt 8 (RTL fix)
> 6. Prompt 9 (Toast system — پیش‌نیاز بقیه)
> 7. Prompt 5 + 20 (Load more + scroll button — با هم)
> 8. Prompt 6 (Typing indicator)
> 9. Prompt 7 (Notifications)
> 10. Prompt 10 (Accessibility)
> 11. بقیه به ترتیب دلخواه
