import os from 'node:os'
import nodePath from 'node:path'

export function expandPath(p: string): string {
    if (p.startsWith('~/')) {
        return nodePath.join(os.homedir(), p.slice(2))
    }
    if (p === '~') {
        return os.homedir()
    }
    return p
}

export function resolvePath(p: string, cwd?: string): string {
    const expanded = expandPath(p)
    if (nodePath.isAbsolute(expanded)) return expanded
    return nodePath.resolve(cwd ?? process.cwd(), expanded)
}
