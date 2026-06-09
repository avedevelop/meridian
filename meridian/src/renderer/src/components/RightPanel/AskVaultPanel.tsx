import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { answerAskVaultQuestion, buildAskVaultContext, type AskVaultAnswer } from '@shared/askVault'
import type { VaultFile } from '@shared/types'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useVaultStore } from '../../store/useVaultStore'
import { useViewsStore } from '../../store/useViewsStore'

function flattenMarkdownFiles(files: VaultFile[]): VaultFile[] {
  const result: VaultFile[] = []
  const visit = (items: VaultFile[]) => {
    for (const item of items) {
      if (item.isDirectory) {
        visit(item.children ?? [])
      } else if (item.name.toLowerCase().endsWith('.md')) {
        result.push(item)
      }
    }
  }
  visit(files)
  return result
}

export function AskVaultPanel() {
  const { t } = useTranslation()
  const vault = useVaultStore((state) => state.vault)
  const files = useVaultStore((state) => state.files)
  const views = useViewsStore((state) => state.views)
  const provider = useSettingsStore((state) => state.askVaultProvider)
  const sendLocalContext = useSettingsStore((state) => state.askVaultSendLocalContext)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<AskVaultAnswer | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const markdownFiles = useMemo(() => flattenMarkdownFiles(files).slice(0, 80), [files])
  const canUseExternalProvider = provider !== 'local' && sendLocalContext

  const handleAsk = async () => {
    const trimmed = question.trim()
    if (!trimmed || !vault) return
    setLoading(true)
    setError('')

    try {
      const notes = await Promise.all(
        markdownFiles.map(async (file) => ({
          path: file.path,
          name: file.name,
          content: await window.vault.readFile(file.path)
        }))
      )
      const context = buildAskVaultContext(notes, views)
      setAnswer(answerAskVaultQuestion(trimmed, context))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  if (!vault) {
    return <div className="properties-workspace--empty">{t('askVault.noVault')}</div>
  }

  return (
    <section className="properties-workspace" role="region" aria-labelledby="ask-vault-title">
      <h2 id="ask-vault-title" className="properties-heading">
        {t('askVault.title')}
      </h2>

      <div className="properties-hint">
        {provider === 'local'
          ? t('askVault.localPrivacy')
          : canUseExternalProvider
            ? t('askVault.externalReady')
            : t('askVault.externalBlocked')}
      </div>

      <textarea
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        placeholder={t('askVault.placeholder')}
        rows={4}
        style={{
          width: '100%',
          resize: 'vertical',
          border: '1px solid var(--utility-divider)',
          borderRadius: 8,
          background: 'var(--utility-surface)',
          color: 'var(--text-primary)',
          fontSize: 13,
          lineHeight: 1.45,
          padding: 10,
          outline: 'none'
        }}
      />

      <button
        type="button"
        className="properties-button properties-button--primary"
        disabled={loading || !question.trim()}
        onClick={handleAsk}
      >
        {loading ? t('common.loading') : t('askVault.ask')}
      </button>

      {error && <div className="properties-alert properties-hint">{error}</div>}

      {answer && (
        <div className="properties-list">
          <div className="properties-section-heading">{t('askVault.answer')}</div>
          <div className="properties-message" style={{ textAlign: 'left' }}>
            {answer.answer || t('askVault.emptyQuestion')}
          </div>

          <div className="properties-section-heading">{t('askVault.sources')}</div>
          {answer.sources.length === 0 ? (
            <div className="properties-message">{t('askVault.noSources')}</div>
          ) : (
            answer.sources.map((source) => (
              <div key={source.path} className="relationship-card">
                <div className="relationship-card__header">
                  <span className="relationship-card__title">{source.name}</span>
                  <span className="relationship-card__meta">{t('askVault.score', { score: source.score })}</span>
                </div>
                <div className="relationship-card__path">{source.path}</div>
                <div className="relationship-card__meta">{source.snippet}</div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
