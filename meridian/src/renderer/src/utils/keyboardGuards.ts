export function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  return (
    element?.tagName === 'INPUT' ||
    element?.tagName === 'TEXTAREA' ||
    element?.isContentEditable === true
  )
}

export function shouldIgnoreGlobalShortcut(event: KeyboardEvent): boolean {
  const altGraph = event.ctrlKey && event.altKey && !event.metaKey
  return event.isComposing || event.key === 'Dead' || altGraph || isEditableTarget(event.target)
}
