import fs from 'node:fs'
import path from 'node:path'
import { VSCODE_BUILTIN_EXTENSIONS_DIR } from './constants'
import { profileArgs } from './utils'

const extensionCache: Map<string, Set<string> | null> = new Map()
let builtinExtensionCache: Set<string> | null = null

export function getExtensions(profileName: string): Set<string> {
    if (extensionCache.has(profileName)) {
        const cached = extensionCache.get(profileName)

        if (cached) return cached
    }

    const result = Bun.spawnSync(['code', ...profileArgs(profileName), '--list-extensions'])
    if (result.exitCode !== 0) {
        console.error('Failed to list VSCode extensions:', result.stderr.toString())

        return new Set()
    }

    const extensions = new Set(
        result.stdout
            .toString()
            .split('\n')
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean),
    )
    for (const extensionId of getBuiltinExtensions()) {
        extensions.add(extensionId)
    }
    extensionCache.set(profileName, extensions)

    return extensions
}

export function invalidateCache(profileName?: string): void {
    if (profileName) {
        extensionCache.delete(profileName)
    } else {
        extensionCache.clear()
    }
}

function getBuiltinExtensions(): Set<string> {
    if (builtinExtensionCache) return builtinExtensionCache

    const extensions = new Set<string>()
    try {
        for (const dirent of fs.readdirSync(VSCODE_BUILTIN_EXTENSIONS_DIR, { withFileTypes: true })) {
            if (!dirent.isDirectory()) continue
            const packagePath = path.join(VSCODE_BUILTIN_EXTENSIONS_DIR, dirent.name, 'package.json')
            const manifest = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
                name?: unknown
                publisher?: unknown
            }
            if (typeof manifest.publisher === 'string' && typeof manifest.name === 'string') {
                extensions.add(`${manifest.publisher}.${manifest.name}`.toLowerCase())
            }
        }
    } catch {
        // Older or non-standard Code installs may not expose built-ins here.
    }

    builtinExtensionCache = extensions
    return extensions
}
