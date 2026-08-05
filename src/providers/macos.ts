import type { ApplyContext, PlanContext, PlanResult, ProviderScope, Step, StepHooks } from '../types'
import { deepMerge, stableJsonStringify } from '../utils/json'
import { noopOrAdopt, shouldSave } from '../utils/plan'
import { readPlist, resolvePlistPath, writePlist } from '../utils/plist'
import { run, runSafe } from '../utils/shell'

type PlistMode = 'patch' | 'replace'
type DefaultsValue = string | number | boolean

function defaultsTypeFlag(val: DefaultsValue): string {
    if (typeof val === 'boolean') return '-bool'
    if (typeof val === 'number') return Number.isInteger(val) ? '-int' : '-float'
    return '-string'
}

function defaultsExpectedString(val: DefaultsValue): string {
    if (typeof val === 'boolean') return val ? '1' : '0'
    return String(val)
}

export class MacosProvider {
    constructor(private readonly scope: ProviderScope) {}

    defaults(
        id: string,
        domain: string,
        values: Record<string, DefaultsValue>,
        options?: { afterChange?: StepHooks['afterChange'] },
    ): void {
        this.scope.addStep(this.defaultsStep(id, domain, values, { afterChange: options?.afterChange }))
    }

    private defaultsStep(
        stepId: string,
        domain: string,
        values: Record<string, DefaultsValue>,
        hooks?: StepHooks,
    ): Step {
        const id = `macos.defaults.${stepId}`

        return {
            id,
            kind: 'macos.defaults',
            title: `macos defaults ${stepId} (${domain})`,
            hooks,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const prevKeys = (applied?.details?.keys as string[] | undefined) ?? []

                const changedKeys = Object.entries(values)
                    .filter(([key, val]) => {
                        const { exitCode, stdout } = runSafe(['defaults', 'read', domain, key])
                        if (exitCode !== 0) return true
                        return stdout !== defaultsExpectedString(val)
                    })
                    .map(([key]) => key)
                const removedKeys = prevKeys.filter((k) => !(k in values))
                const allChanged = [...changedKeys, ...removedKeys]

                if (allChanged.length === 0) return noopOrAdopt(applied, `${domain} defaults already correct`)

                const parts: string[] = []
                if (changedKeys.length > 0) parts.push(`update: ${changedKeys.join(', ')}`)
                if (removedKeys.length > 0) parts.push(`delete: ${removedKeys.join(', ')}`)

                return {
                    action: 'update',
                    message: `will write defaults ${domain} (${parts.join('; ')})`,
                    changed: true,
                    data: { changedKeys, removedKeys },
                }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    const { changedKeys = [], removedKeys = [] } =
                        (plan.data as { changedKeys: string[]; removedKeys: string[] } | undefined) ?? {}

                    for (const key of changedKeys) {
                        const val = values[key] as DefaultsValue
                        await run(['defaults', 'write', domain, key, defaultsTypeFlag(val), String(val)])
                    }
                    for (const key of removedKeys) {
                        runSafe(['defaults', 'delete', domain, key])
                    }
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({
                        id,
                        kind: 'macos.defaults',
                        details: { domain, keys: Object.keys(values) },
                    })
                }
            },
        }
    }

    plist(
        id: string,
        domainOrPath: string,
        options: {
            mode: PlistMode
            values: Record<string, unknown>
            afterChange?: StepHooks['afterChange']
        },
    ): void {
        this.scope.addStep(
            this.plistStep(id, domainOrPath, options.mode, options.values, {
                afterChange: options.afterChange,
            }),
        )
    }

    private plistStep(
        stepId: string,
        domainOrPath: string,
        mode: PlistMode,
        values: Record<string, unknown>,
        hooks?: StepHooks,
    ): Step {
        const id = `macos.plist.${stepId}`
        const filePath = resolvePlistPath(domainOrPath)

        return {
            id,
            kind: 'macos.plist',
            title: `macos plist ${stepId} (${domainOrPath})`,
            hooks,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const existing = readPlist(filePath)

                const prevKeys = (applied?.details?.keys as string[] | undefined) ?? []
                const merged = mode === 'replace' ? values : deepMerge(existing, values)
                const changedKeys = Object.keys(values).filter(
                    (k) => stableJsonStringify(existing[k]) !== stableJsonStringify(merged[k]),
                )
                const removedKeys = prevKeys.filter((k) => !(k in values))
                const allChanged = [...changedKeys, ...removedKeys]

                if (allChanged.length === 0) return noopOrAdopt(applied, `${domainOrPath} already correct`)

                const parts: string[] = []
                if (changedKeys.length > 0) parts.push(`update: ${changedKeys.join(', ')}`)
                if (removedKeys.length > 0) parts.push(`delete: ${removedKeys.join(', ')}`)

                return {
                    action: 'update',
                    message: `will patch plist ${domainOrPath} (${parts.join('; ')})`,
                    changed: true,
                    data: { changedKeys, removedKeys },
                }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    const existing = readPlist(filePath)
                    let result: Record<string, unknown>

                    if (mode === 'replace') {
                        result = { ...values }
                    } else {
                        result = deepMerge(existing, values)
                        const { removedKeys = [] } =
                            (plan.data as { changedKeys: string[]; removedKeys: string[] } | undefined) ?? {}
                        for (const k of removedKeys) delete result[k]
                    }

                    writePlist(filePath, result)
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({
                        id,
                        kind: 'macos.plist',
                        details: { domain: domainOrPath, path: filePath, mode, keys: Object.keys(values) },
                    })
                }
            },
        }
    }
}
