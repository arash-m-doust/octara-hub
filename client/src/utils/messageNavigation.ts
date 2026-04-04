export function jumpToMessage(messageId: number): boolean {
  const target = document.querySelector<HTMLElement>(`[data-message-id="${messageId}"]`)
  if (!target) return false

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.classList.add('ring-2')
  target.style.background = 'var(--color-accent-soft)'
  target.style.borderRadius = '6px'
  target.style.transition = 'background 1s'
  window.setTimeout(() => {
    target.style.background = ''
    target.style.borderRadius = ''
    target.style.transition = ''
    target.classList.remove('ring-2')
  }, 1500)
  return true
}

