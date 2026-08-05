import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createDotori, type DotoriContext, type DotoriOptions, type Queue } from './context'
import type { MaybePromise } from './types'

export type DotoriConfig = (ctx: DotoriContext) => MaybePromise<void>

export function defineConfig(config: DotoriConfig): DotoriConfig {
    return config
}

function resolveConfigPath(configPath: string): string {
    const resolved = path.resolve(configPath)
    const candidates = [
        resolved,
        resolved.endsWith('.ts') ? resolved : `${resolved}.ts`,
        path.join(resolved, 'index.ts'),
        path.join(resolved, 'index.js'),
    ]

    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }

    throw new Error(`Config file not found: ${resolved}`)
}

export async function createQueue(config: DotoriConfig, options: DotoriOptions): Promise<Queue> {
    const runtime = createDotori(options)
    await config(runtime.context)
    return runtime.queue
}

export async function loadConfig(configPath: string, options: Partial<DotoriOptions> = {}): Promise<Queue> {
    const resolved = resolveConfigPath(configPath)

    const mod = await import(pathToFileURL(resolved).href)
    const fn: unknown = mod.default ?? mod
    if (typeof fn !== 'function') {
        throw new Error(`Config must export a default function`)
    }

    return createQueue(fn as DotoriConfig, {
        ...options,
        configCwd: options.configCwd ?? path.dirname(resolved),
    })
}
