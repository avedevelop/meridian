import { execFile } from 'child_process'
import { isPrivateAppBundle } from './privacy'

/** How long after a password manager was last seen in front its clipboard writes are still ignored. */
export const PRIVATE_APP_GRACE_MS = 5000

export type RunCommand = (cmd: string, args: string[]) => Promise<string>

const run: RunCommand = (cmd, args) =>
  new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: 1500 }, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  })

/**
 * `lsappinfo info -only bundleid <asn>` prints a block whose line reads `bundleID="com.apple.Passwords"`
 * (seen on a real Mac). Older releases printed `"CFBundleIdentifier"="..."`, so accept both.
 */
export function parseBundleId(output: string): string | null {
  const m = /(?:^|\s)(?:bundleID|"CFBundleIdentifier")\s*=\s*"([^"]+)"/m.exec(output)
  return m ? m[1] : null
}

/**
 * Apple Passwords puts plain text on the clipboard with no "concealed" marker, so the only way to keep its
 * passwords out of the history is to know which app the copy came from. `lsappinfo` ships with macOS and
 * needs no permission. It is sampled once per poll, and a sighting counts for a few seconds because the
 * user can switch apps before the next poll notices the change.
 */
export class PrivateAppMonitor {
  private lastPrivateSeen = -Infinity
  private inFlight = false

  constructor(
    private readonly now: () => number = Date.now,
    private readonly exec: RunCommand = run
  ) {}

  /** Fire and forget; failures leave the state as it was. */
  sample(): void {
    if (this.inFlight) return
    this.inFlight = true
    void this.lookup()
      .then((bundle) => {
        if (bundle && isPrivateAppBundle(bundle)) this.lastPrivateSeen = this.now()
      })
      .catch(() => undefined)
      .finally(() => {
        this.inFlight = false
      })
  }

  isPrivateAppActive(): boolean {
    return this.now() - this.lastPrivateSeen <= PRIVATE_APP_GRACE_MS
  }

  private async lookup(): Promise<string | null> {
    const asn = (await this.exec('/usr/bin/lsappinfo', ['front'])).trim()
    if (!asn) return null
    return parseBundleId(await this.exec('/usr/bin/lsappinfo', ['info', '-only', 'bundleid', asn]))
  }
}
