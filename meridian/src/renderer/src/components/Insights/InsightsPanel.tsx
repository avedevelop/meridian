import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useVaultStore } from '../../store/useVaultStore'
import { useLinkStore } from '../../store/useLinkStore'
import { countWords, buildHeatmap, topLinked } from '../../lib/vaultStats'

type SidebarTab = 'files' | 'search' | 'graph' | 'calendar' | 'tasks' | 'views' | 'git' | 'insights'

interface InsightsPanelProps {
  onTabChange: (tab: SidebarTab) => void
}

interface Stats {
  noteCount: number
  wordCount: number
  linkCount: number
  topLinkedNotes: { path: string; count: number }[]
  tagCount: number
  heatmap: { date: string; count: number }[]
}

function heatmapIntensity(count: number, maxCount: number): number {
  if (count === 0 || maxCount === 0) return 0
  const ratio = count / maxCount
  if (ratio <= 0.2) return 1
  if (ratio <= 0.4) return 2
  if (ratio <= 0.6) return 3
  if (ratio <= 0.8) return 4
  return 5
}

export function InsightsPanel({ onTabChange }: InsightsPanelProps) {
  const { t } = useTranslation()
  const vault = useVaultStore((s) => s.vault)
  const vaultFiles = useVaultStore((s) => s.files)
  const allFiles = useLinkStore((s) => s.allFiles)
  const backlinks = useLinkStore((s) => s.backlinks)
  const allTags = useLinkStore((s) => s.allTags)
  const indexVersion = useLinkStore((s) => s.indexVersion)

  const [computing, setComputing] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    if (!vault) return

    let cancelled = false

    async function compute() {
      setComputing(true)

      try {
        // Flatten vault files to get all .md files
        function flatten(files: typeof vaultFiles): typeof vaultFiles {
          return files.flatMap((f) =>
            f.isDirectory && f.children ? [f, ...flatten(f.children)] : [f]
          )
        }
        const flat = flatten(vaultFiles).filter((f) => !f.isDirectory && f.name.endsWith('.md'))

        const noteCount = flat.length

        // Build link count map: path → number of backlinks it receives
        const allPaths = allFiles()
        const linkCountMap = new Map<string, number>()
        for (const path of allPaths) {
          const bls = backlinks(path)
          if (bls.length > 0) linkCountMap.set(path, bls.length)
        }

        // Total links = total outlinks across all files
        let totalLinks = 0
        for (const [, count] of linkCountMap) {
          totalLinks += count
        }

        const top5 = topLinked(linkCountMap, 5)

        // Tags from existing index
        const tagsMap = allTags()
        const tagCount = tagsMap.size

        // Heatmap from mtimes
        const mtimes = flat.map((f) => new Date(f.mtime))
        const heatmap = buildHeatmap(mtimes, 90)

        // Read file contents sequentially for word count
        let wordCount = 0
        for (const f of flat) {
          if (cancelled) return
          try {
            const content = await window.vault.readFile(f.path)
            wordCount += countWords(content)
          } catch {
            // skip unreadable files
          }
        }

        if (!cancelled) {
          setStats({
            noteCount,
            wordCount,
            linkCount: totalLinks,
            topLinkedNotes: top5,
            tagCount,
            heatmap
          })
          setComputing(false)
        }
      } catch {
        if (!cancelled) setComputing(false)
      }
    }

    compute()
    return () => {
      cancelled = true
    }
    // Re-run when vault path, file list, or link index changes
  }, [vault?.path, vaultFiles, indexVersion, allFiles, backlinks, allTags])

  const maxHeatmapCount = stats ? Math.max(...stats.heatmap.map((b) => b.count), 1) : 1

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 900,
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 16px',
          borderBottom: '1px solid var(--border-color)',
          flexShrink: 0,
          // @ts-ignore -- Electron drag region
          WebkitAppRegion: 'no-drag'
        }}
      >
        <button
          onClick={() => onTabChange('files')}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            padding: '4px 8px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          ←
        </button>

        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
          {t('insights.title')}
        </span>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px'
        }}
      >
        {computing ? (
          <div
            style={{
              color: 'var(--text-secondary)',
              fontSize: 13,
              textAlign: 'center',
              paddingTop: 32
            }}
          >
            {t('insights.computing')}
          </div>
        ) : stats ? (
          <>
            {/* Stat cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                marginBottom: 20
              }}
            >
              <StatCard label={t('insights.notes')} value={stats.noteCount} />
              <StatCard label={t('insights.words')} value={formatNumber(stats.wordCount)} />
              <StatCard label={t('insights.links')} value={stats.linkCount} />
              {stats.tagCount > 0 && <StatCard label={t('insights.tags')} value={stats.tagCount} />}
            </div>

            {/* Top linked notes */}
            {stats.topLinkedNotes.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 8
                  }}
                >
                  {t('insights.topLinked')}
                </div>
                {stats.topLinkedNotes.map(({ path, count }) => {
                  const name = path.split('/').pop()?.replace(/\.md$/i, '') ?? path
                  return (
                    <div
                      key={path}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '5px 0',
                        borderBottom: '1px solid var(--border-color)',
                        fontSize: 12
                      }}
                    >
                      <span
                        style={{
                          color: 'var(--text-primary)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1
                        }}
                        title={path}
                      >
                        {name}
                      </span>
                      <span
                        style={{
                          color: 'var(--text-secondary)',
                          flexShrink: 0,
                          marginLeft: 8,
                          fontSize: 11
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Heatmap */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 8
                }}
              >
                {t('insights.activity')}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(13, 1fr)',
                  gap: 3
                }}
              >
                {stats.heatmap.map(({ date, count }) => {
                  const level = heatmapIntensity(count, maxHeatmapCount)
                  return (
                    <div
                      key={date}
                      title={`${date}: ${count}`}
                      style={{
                        aspectRatio: '1',
                        borderRadius: 2,
                        background: 'var(--accent-color)',
                        opacity: level === 0 ? 0.08 : 0.08 + level * 0.18,
                        cursor: count > 0 ? 'default' : undefined
                      }}
                    />
                  )
                })}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: '12px 14px'
      }}
    >
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-secondary)',
          marginTop: 4
        }}
      >
        {label}
      </div>
    </div>
  )
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}
