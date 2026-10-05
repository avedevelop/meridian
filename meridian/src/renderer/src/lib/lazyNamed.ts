import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/** `React.lazy` for modules with named exports: `lazyNamed(() => import('./Foo'), 'Foo')`. */
export function lazyNamed<K extends string, P>(
  load: () => Promise<Record<K, ComponentType<P>>>,
  name: K
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() => load().then((m) => ({ default: m[name] })))
}
