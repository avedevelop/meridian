import { Suspense } from 'react'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { lazyNamed } from '../../src/renderer/src/lib/lazyNamed'

function Hello({ name }: { name: string }): React.ReactElement {
  return <div>hello {name}</div>
}

describe('lazyNamed', () => {
  it('loads a named export on first render and passes props through', async () => {
    let loads = 0
    const Lazy = lazyNamed(async () => {
      loads++
      return { Hello }
    }, 'Hello')

    render(
      <Suspense fallback={<div>loading</div>}>
        <Lazy name="world" />
      </Suspense>
    )
    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(await screen.findByText('hello world')).toBeInTheDocument()
    expect(loads).toBe(1)
  })
})
