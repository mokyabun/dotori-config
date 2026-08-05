import type { ApplyContext, PlanContext, PlanResult, ProviderScope, Step } from '../types'
import { noopOrAdopt, shouldSave } from '../utils/plan'
import { run } from '../utils/shell'

const BREW_ENV = {
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_INSTALL_CLEANUP: '1',
    HOMEBREW_NO_ANALYTICS: '1',
}

export class BrewProvider {
    // Shared cache to prevent re-querying brew for every step
    private static formulae: Set<string> | null = null
    private static casks: Set<string> | null = null
    private static taps: Set<string> | null = null
    private static trusted: {
        taps: Set<string>
        formulae: Set<string>
        casks: Set<string>
        commands: Set<string>
    } | null = null

    constructor(private readonly scope: ProviderScope) {}

    install(name: string): void {
        this.scope.addStep(this.formulaStep(name))
    }

    cask(name: string): void {
        this.scope.addStep(this.caskStep(name))
    }

    tap(repo: string): void {
        this.scope.addStep(this.tapStep(repo))
    }

    trustTap(repo: string): void {
        this.scope.addStep(this.trustStep('tap', repo))
    }

    trustFormula(name: string): void {
        this.scope.addStep(this.trustStep('formula', name))
    }

    trustCask(name: string): void {
        this.scope.addStep(this.trustStep('cask', name))
    }

    private static async getFormulae(): Promise<Set<string>> {
        if (!BrewProvider.formulae) {
            const out = await run(['brew', 'list', '--formula', '-1'], BREW_ENV)
            BrewProvider.formulae = new Set(out.split('\n').filter(Boolean))
        }
        return BrewProvider.formulae
    }

    private static async getCasks(): Promise<Set<string>> {
        if (!BrewProvider.casks) {
            const out = await run(['brew', 'list', '--cask', '-1'], BREW_ENV)
            BrewProvider.casks = new Set(out.split('\n').filter(Boolean))
        }
        return BrewProvider.casks
    }

    private static async getTaps(): Promise<Set<string>> {
        if (!BrewProvider.taps) {
            const out = await run(['brew', 'tap'], BREW_ENV)
            BrewProvider.taps = new Set(out.split('\n').filter(Boolean))
        }
        return BrewProvider.taps
    }

    private static async getTrusted(): Promise<{
        taps: Set<string>
        formulae: Set<string>
        casks: Set<string>
        commands: Set<string>
    }> {
        if (!BrewProvider.trusted) {
            const out = await run(['brew', 'trust', '--json=v1'], BREW_ENV)
            const json = JSON.parse(out) as {
                taps?: string[]
                formulae?: string[]
                casks?: string[]
                commands?: string[]
            }
            BrewProvider.trusted = {
                taps: new Set(json.taps ?? []),
                formulae: new Set(json.formulae ?? []),
                casks: new Set(json.casks ?? []),
                commands: new Set(json.commands ?? []),
            }
        }
        return BrewProvider.trusted
    }

    static invalidateCache(): void {
        BrewProvider.formulae = null
        BrewProvider.casks = null
        BrewProvider.taps = null
        BrewProvider.trusted = null
    }

    private formulaStep(name: string): Step {
        const id = `brew.formula.${name}`
        const installedName = name.split('/').at(-1) ?? name
        return {
            id,
            kind: 'brew.formula',
            title: `brew install ${name}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const [installed, applied] = await Promise.all([BrewProvider.getFormulae(), ctx.getAppliedState(id)])
                if (installed.has(name) || installed.has(installedName))
                    return noopOrAdopt(applied, `${name} already installed`)
                return { action: 'create', message: `will install ${name}`, changed: true }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create') {
                    await run(['brew', 'install', name], BREW_ENV)
                    BrewProvider.invalidateCache()
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'brew.formula', details: { name } })
                }
            },
        }
    }

    private caskStep(name: string): Step {
        const id = `brew.cask.${name}`
        return {
            id,
            kind: 'brew.cask',
            title: `brew install --cask ${name}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const [installed, applied] = await Promise.all([BrewProvider.getCasks(), ctx.getAppliedState(id)])
                if (!installed.has(name))
                    return { action: 'create', message: `will install cask ${name}`, changed: true }
                return noopOrAdopt(applied, `${name} already installed`)
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create') {
                    await run(['brew', 'install', '--cask', name], BREW_ENV)
                    BrewProvider.invalidateCache()
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'brew.cask', details: { name } })
                }
            },
        }
    }

    private tapStep(repo: string): Step {
        const id = `brew.tap.${repo}`
        return {
            id,
            kind: 'brew.tap',
            title: `brew tap ${repo}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const [tapped, applied] = await Promise.all([BrewProvider.getTaps(), ctx.getAppliedState(id)])
                if (!tapped.has(repo)) return { action: 'create', message: `will tap ${repo}`, changed: true }
                return noopOrAdopt(applied, `${repo} already tapped`)
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create') {
                    await run(['brew', 'tap', repo], BREW_ENV)
                    BrewProvider.invalidateCache()
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'brew.tap', details: { repo } })
                }
            },
        }
    }

    private trustStep(kind: 'tap' | 'formula' | 'cask', name: string): Step {
        const plural = kind === 'tap' ? 'taps' : kind === 'formula' ? 'formulae' : 'casks'
        const id = `brew.trust.${kind}.${name}`
        return {
            id,
            kind: `brew.trust.${kind}`,
            title: `brew trust --${kind} ${name}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const [trusted, applied] = await Promise.all([BrewProvider.getTrusted(), ctx.getAppliedState(id)])
                if (trusted[plural].has(name)) return noopOrAdopt(applied, `${name} already trusted`)
                return { action: 'create', message: `will trust ${kind} ${name}`, changed: true }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create') {
                    await run(['brew', 'trust', `--${kind}`, name], BREW_ENV)
                    BrewProvider.invalidateCache()
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: `brew.trust.${kind}`, details: { name } })
                }
            },
        }
    }
}

export async function cleanBrewFormula(name: string): Promise<void> {
    const out = await run(['brew', 'list', '--formula', '-1'], BREW_ENV).catch(() => '')
    if (out.split('\n').includes(name)) {
        await run(['brew', 'uninstall', name], BREW_ENV)
    }
}

export async function cleanBrewCask(name: string): Promise<void> {
    const out = await run(['brew', 'list', '--cask', '-1'], BREW_ENV).catch(() => '')
    if (out.split('\n').includes(name)) {
        await run(['brew', 'uninstall', '--cask', name], BREW_ENV)
    }
}

export async function cleanBrewTap(repo: string): Promise<void> {
    const out = await run(['brew', 'tap'], BREW_ENV).catch(() => '')
    if (out.split('\n').includes(repo)) {
        await run(['brew', 'untap', repo], BREW_ENV)
    }
}

export async function cleanBrewTrust(kind: 'tap' | 'formula' | 'cask', name: string): Promise<void> {
    const plural = kind === 'tap' ? 'taps' : kind === 'formula' ? 'formulae' : 'casks'
    const out = await run(['brew', 'trust', '--json=v1'], BREW_ENV).catch(() => '')
    if (!out) return

    const json = JSON.parse(out) as {
        taps?: string[]
        formulae?: string[]
        casks?: string[]
    }
    if ((json[plural] ?? []).includes(name)) {
        await run(['brew', 'untrust', `--${kind}`, name], BREW_ENV)
    }
}
