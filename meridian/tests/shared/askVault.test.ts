import { describe, expect, it } from 'vitest'
import { answerAskVaultQuestion, buildAskVaultContext } from '../../src/shared/askVault'
import { getDefaultSavedViews } from '../../src/shared/views'

describe('Ask Vault context', () => {
  it('builds sources from markdown notes and keeps metadata for citations', () => {
    const context = buildAskVaultContext([
      {
        path: '/vault/Projects/Alpha.md',
        name: 'Alpha.md',
        content: '---\ntype: project\nrelated: [Ada]\n---\n\n# Alpha\nLaunch notes'
      },
      {
        path: '/vault/assets/logo.png',
        name: 'logo.png',
        content: ''
      }
    ])

    expect(context.sources).toHaveLength(1)
    expect(context.sources[0]).toMatchObject({
      path: '/vault/Projects/Alpha.md',
      name: 'Alpha.md',
      properties: { type: 'project', related: ['Ada'] }
    })
    expect(context.sources[0].relations.map((relation) => relation.target)).toEqual(['Ada'])
  })

  it('answers with ranked local sources and saved view context', () => {
    const context = buildAskVaultContext(
      [
        {
          path: '/vault/Projects/Alpha.md',
          name: 'Alpha.md',
          content: '---\ntype: project\n---\n\nAlpha launch plan and roadmap.'
        },
        {
          path: '/vault/Daily/Today.md',
          name: 'Today.md',
          content: 'Daily notes about errands.'
        }
      ],
      getDefaultSavedViews()
    )

    const result = answerAskVaultQuestion('Where is the launch roadmap?', context)

    expect(result.sources.map((source) => source.name)).toEqual(['Alpha.md'])
    expect(result.answer).toContain('Alpha')
    expect(result.answer).toContain('Saved views')
  })

  it('does not invent sources when the question has no local match', () => {
    const context = buildAskVaultContext([
      { path: '/vault/Note.md', name: 'Note.md', content: '# Note\nOnly local text.' }
    ])

    const result = answerAskVaultQuestion('quantum invoices', context)

    expect(result.sources).toEqual([])
    expect(result.answer).toContain('No matching')
  })
})
