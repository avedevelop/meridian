import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { EditorView } from '@codemirror/view'

interface EditorContextMenuProps {
  x: number
  y: number
  onClose: () => void
  view: EditorView | null
  containerEl: HTMLDivElement | null
}

export function EditorContextMenu({ x, y, onClose, view, containerEl }: EditorContextMenuProps) {
  const { t } = useTranslation()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    window.addEventListener('mousedown', handleOutsideClick)
    return () => window.removeEventListener('mousedown', handleOutsideClick)
  }, [onClose])

  if (!view) return null

  const selection = view.state.selection.main
  const hasSelection = selection.from !== selection.to

  const executeAction = async (action: string) => {
    onClose()
    view.focus()

    switch (action) {
      case 'cut': {
        if (!hasSelection) return
        const text = view.state.sliceDoc(selection.from, selection.to)
        await navigator.clipboard.writeText(text)
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: '' }
        })
        break
      }
      case 'copy': {
        if (!hasSelection) return
        const text = view.state.sliceDoc(selection.from, selection.to)
        await navigator.clipboard.writeText(text)
        break
      }
      case 'paste': {
        try {
          const clipboardText = await navigator.clipboard.readText()
          view.dispatch({
            changes: { from: selection.from, to: selection.to, insert: clipboardText },
            selection: { anchor: selection.from + clipboardText.length }
          })
        } catch (err) {
          console.error('Clipboard paste failed:', err)
        }
        break
      }
      case 'select-all': {
        view.dispatch({
          selection: { anchor: 0, head: view.state.doc.length }
        })
        break
      }
      case 'bold': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `**${text}**`
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'italic': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `*${text}*`
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'code': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `\`${text || 'code'}\``
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'link': {
        const text = view.state.sliceDoc(selection.from, selection.to)
        const insertText = `[[${text || 'Note'}]]`
        view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'checklist': {
        const line = view.state.doc.lineAt(selection.from)
        const insertText = `- [ ] `
        view.dispatch({
          changes: { from: line.from, to: line.from, insert: insertText },
          selection: { anchor: selection.from + insertText.length }
        })
        break
      }
      case 'clear': {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: '' }
        })
        break
      }
    }
  }

  // Adjust coordinates to not overflow container edges
  const menuWidth = 190
  const menuHeight = 350
  const containerRect = containerEl?.getBoundingClientRect()
  const limitX = containerRect ? containerRect.width - menuWidth : 800
  const limitY = containerRect ? containerRect.height - menuHeight : 600
  
  const adjustedX = Math.min(x, limitX - 10)
  const adjustedY = Math.min(y, limitY - 10)

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: Math.max(10, adjustedX),
        top: Math.max(10, adjustedY),
        zIndex: 2000,
        width: menuWidth,
        background: 'rgba(22, 22, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 8,
        padding: '6px 0',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
        animation: 'menuFadeIn 0.12s ease-out',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none'
      }}
    >
      <style>{`
        @keyframes menuFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s ease;
          background: transparent;
          border: none;
          text-align: left;
          width: 100%;
        }
        .menu-item:hover:not(.disabled) {
          background: var(--accent-color);
          color: #ffffff;
        }
        .menu-item.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .menu-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.06);
          margin: 4px 0;
        }
      `}</style>

      <button className={`menu-item ${!hasSelection ? 'disabled' : ''}`} onClick={() => executeAction('cut')} disabled={!hasSelection}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
        <span>{t('editor.contextMenu.cut')}</span>
      </button>
 
      <button className={`menu-item ${!hasSelection ? 'disabled' : ''}`} onClick={() => executeAction('copy')} disabled={!hasSelection}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>{t('editor.contextMenu.copy')}</span>
      </button>
 
      <button className="menu-item" onClick={() => executeAction('paste')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
        <span>{t('editor.contextMenu.paste')}</span>
      </button>
 
      <button className="menu-item" onClick={() => executeAction('select-all')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4"></rect><path d="M9 12h6M12 9v6"></path></svg>
        <span>{t('editor.contextMenu.selectAll')}</span>
      </button>
 
      <div className="menu-divider" />
 
      <button className="menu-item" onClick={() => executeAction('bold')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path></svg>
        <span>{t('editor.contextMenu.bold')}</span>
      </button>
 
      <button className="menu-item" onClick={() => executeAction('italic')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="4" x2="10" y2="4"></line><line x1="14" y1="20" x2="5" y2="20"></line><line x1="15" y1="4" x2="9" y2="20"></line></svg>
        <span>{t('editor.contextMenu.italic')}</span>
      </button>
 
      <button className="menu-item" onClick={() => executeAction('code')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
        <span>{t('editor.contextMenu.codeInline')}</span>
      </button>
 
      <div className="menu-divider" />
 
      <button className="menu-item" onClick={() => executeAction('link')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        <span>{t('editor.contextMenu.wikiLink')}</span>
      </button>
 
      <button className="menu-item" onClick={() => executeAction('checklist')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><path d="M9 12l2 2 4-4"></path></svg>
        <span>{t('editor.contextMenu.todoItem')}</span>
      </button>
 
      <div className="menu-divider" />
 
      <button className="menu-item" onClick={() => executeAction('clear')} style={{ color: '#ef4444' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>{t('editor.contextMenu.clearDocument')}</span>
      </button>
    </div>
  )
}
