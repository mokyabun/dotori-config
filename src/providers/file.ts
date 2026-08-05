import fs from 'node:fs'
import path from 'node:path'
import type { ApplyContext, PlanContext, PlanResult, ProviderScope, Step, StepHooks } from '../types'
import { atomicWriteFile, atomicWriteJson } from '../utils/atomic'
import { jsonPatch, removeKeys } from '../utils/json'
import { resolvePath } from '../utils/path'
import { noopOrAdopt, shouldSave } from '../utils/plan'

type JsonMode = 'patch' | 'replace'

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const BLOCK_START = (marker: string) => `# BEGIN DOTORI:${marker}`
const BLOCK_END = (marker: string) => `# END DOTORI:${marker}`

export class FileProvider {
    constructor(private readonly scope: ProviderScope) {}

    symlink(linkPath: string, target: string): void {
        this.scope.addStep(this.symlinkStep(linkPath, target))
    }

    block(filePath: string, marker: string, content: string): void {
        this.scope.addStep(this.textBlockStep(filePath, marker, content))
    }

    json(filePath: string, options: { mode: JsonMode; values: Record<string, unknown>; hooks?: StepHooks }): void {
        this.scope.addStep(this.jsonFileStep(filePath, options.mode, options.values, options.hooks))
    }

    download(destPath: string, url: string): void {
        this.scope.addStep(this.downloadStep(destPath, url))
    }

    private symlinkStep(linkPath: string, target: string): Step {
        const resolvedLink = resolvePath(linkPath, this.scope.configCwd)
        const resolvedTarget = resolvePath(target, this.scope.configCwd)
        const id = `file.symlink.${resolvedLink}`

        return {
            id,
            kind: 'file.symlink',
            title: `symlink ${linkPath} → ${target}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                let existing: string | null = null
                try {
                    const stat = fs.lstatSync(resolvedLink)
                    if (stat.isSymbolicLink()) existing = fs.readlinkSync(resolvedLink)
                } catch {}

                if (existing === resolvedTarget) return noopOrAdopt(applied, `symlink ${linkPath} already correct`)
                if (existing !== null) {
                    return {
                        action: 'update',
                        message: `symlink ${linkPath} points to ${existing}, will update to ${resolvedTarget}`,
                        changed: true,
                    }
                }
                return {
                    action: 'create',
                    message: `will create symlink ${linkPath} → ${resolvedTarget}`,
                    changed: true,
                }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    fs.mkdirSync(path.dirname(resolvedLink), { recursive: true })
                    try {
                        fs.unlinkSync(resolvedLink)
                    } catch {}
                    fs.symlinkSync(resolvedTarget, resolvedLink)
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({
                        id,
                        kind: 'file.symlink',
                        details: { path: resolvedLink, target: resolvedTarget },
                    })
                }
            },
        }
    }

    private textBlockStep(filePath: string, marker: string, content: string): Step {
        const resolvedFile = resolvePath(filePath, this.scope.configCwd)
        const id = `file.block.${resolvedFile}.${marker}`
        const start = BLOCK_START(marker)
        const end = BLOCK_END(marker)
        const desired = `${start}\n${content}\n${end}`
        const blockRegex = new RegExp(`${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}`, 'g')

        function readContent(): string {
            try {
                return fs.readFileSync(resolvedFile, 'utf8')
            } catch {
                return ''
            }
        }

        return {
            id,
            kind: 'file.block',
            title: `text block ${marker} in ${filePath}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const fileContent = readContent()

                if (fileContent.includes(start)) {
                    const current = fileContent.match(blockRegex)?.[0]
                    if (current === desired) return noopOrAdopt(applied, `block ${marker} already correct`)
                    return { action: 'update', message: `will update block ${marker} in ${filePath}`, changed: true }
                }
                return { action: 'create', message: `will insert block ${marker} into ${filePath}`, changed: true }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    let fileContent = readContent()
                    fileContent = fileContent.includes(start)
                        ? fileContent.replace(blockRegex, desired)
                        : fileContent
                          ? `${fileContent}\n${desired}\n`
                          : `${desired}\n`
                    atomicWriteFile(resolvedFile, fileContent)
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'file.block', details: { path: resolvedFile, marker } })
                }
            },
        }
    }

    private jsonFileStep(filePath: string, mode: JsonMode, values: Record<string, unknown>, hooks?: StepHooks): Step {
        const resolvedFile = resolvePath(filePath, this.scope.configCwd)
        const id = `file.json.${resolvedFile}`

        function readExisting(): Record<string, unknown> {
            try {
                return JSON.parse(fs.readFileSync(resolvedFile, 'utf8'))
            } catch {
                return {}
            }
        }

        return {
            id,
            kind: 'file.json',
            title: `json ${mode} ${filePath}`,
            hooks,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const existing = readExisting()

                if (mode === 'replace') {
                    if (JSON.stringify(existing) === JSON.stringify(values)) {
                        return noopOrAdopt(applied, `${filePath} already correct`)
                    }
                    return { action: 'update', message: `will replace ${filePath}`, changed: true }
                }

                const { changedKeys } = jsonPatch(existing, values)
                if (changedKeys.length === 0) return noopOrAdopt(applied, `${filePath} already correct`)
                return {
                    action: Object.keys(existing).length > 0 ? 'update' : 'create',
                    message: `will patch ${filePath} (keys: ${changedKeys.join(', ')})`,
                    changed: true,
                }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    const existing = readExisting()
                    let result: Record<string, unknown>

                    if (mode === 'replace') {
                        result = values
                    } else {
                        result = jsonPatch(existing, values).result
                        const prevApplied = await ctx.getAppliedState(id)
                        const prevKeys = prevApplied?.details?.keys
                        if (Array.isArray(prevKeys)) {
                            const removed = (prevKeys as string[]).filter((k) => !(k in values))
                            result = removeKeys(result, removed)
                        }
                    }
                    atomicWriteJson(resolvedFile, result)
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({
                        id,
                        kind: 'file.json',
                        details: { path: resolvedFile, mode, keys: Object.keys(values) },
                    })
                }
            },
        }
    }
    private downloadStep(destPath: string, url: string): Step {
        const resolvedDest = resolvePath(destPath, this.scope.configCwd)
        const id = `file.download.${resolvedDest}`

        return {
            id,
            kind: 'file.download',
            title: `download ${path.basename(resolvedDest)}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const exists = fs.existsSync(resolvedDest)
                if (exists) return noopOrAdopt(applied, `${destPath} already exists`)
                return { action: 'create', message: `will download ${url} → ${destPath}`, changed: true }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create') {
                    const res = await fetch(url)
                    if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status} ${res.statusText}`)
                    const buf = await res.arrayBuffer()
                    fs.mkdirSync(path.dirname(resolvedDest), { recursive: true })
                    fs.writeFileSync(resolvedDest, Buffer.from(buf))
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'file.download', details: { path: resolvedDest, url } })
                }
            },
        }
    }
}

// ── Clean helpers (used by clean command) ─────────────────────────────────────

export function cleanSymlink(linkPath: string, target: string): void {
    try {
        const stat = fs.lstatSync(linkPath)
        if (stat.isSymbolicLink() && fs.readlinkSync(linkPath) === target) {
            fs.unlinkSync(linkPath)
        }
    } catch {}
}

export function cleanTextBlock(filePath: string, marker: string): void {
    try {
        const start = BLOCK_START(marker)
        const end = BLOCK_END(marker)
        const blockRegex = new RegExp(`\n?${escapeRegex(start)}[\\s\\S]*?${escapeRegex(end)}\n?`, 'g')
        let content = fs.readFileSync(filePath, 'utf8')
        content = content.replace(blockRegex, '\n').replace(/\n{3,}/g, '\n\n')
        atomicWriteFile(filePath, content)
    } catch {}
}
