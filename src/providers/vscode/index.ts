import fs from 'node:fs'
import path from 'node:path'
import type { ApplyContext, PlanContext, PlanResult, ProviderScope, Step, StepHooks } from '@/types'
import { atomicWriteJson } from '@/utils/atomic'
import { jsonPatch, removeKeys } from '@/utils/json'
import { noopOrAdopt, shouldSave } from '@/utils/plan'
import { run } from '@/utils/shell'
import { STORAGE_PATH } from './constants'
import { getExtensions } from './extension'
import type { Keybinding, SettingsMode } from './types'
import {
    keybindingsPath,
    mcpPath,
    profileArgs,
    profileDir,
    profileGlobalStorageDir,
    readJsonFile,
    settingsPath,
    snippetsDir,
    tasksPath,
} from './utils'

export class VscodeProvider {
    constructor(private readonly scope: ProviderScope) {}

    profile(name: string, config: { location?: string; hooks?: StepHooks } = {}): void {
        if (name !== 'default') {
            this.scope.addStep(this.profileStep(name, config.location ?? name, config.hooks))
        }
    }

    settings(profileName: string, mode: SettingsMode, values: Record<string, unknown>, hooks?: StepHooks): void {
        this.scope.addStep(this.settingsStep(profileName, mode, values, hooks))
    }

    extensions(profileName: string, extensionIds: string[]): void {
        for (const extensionId of extensionIds) {
            this.scope.addStep(this.extensionStep(profileName, extensionId))
        }
    }

    keybindings(profileName: string, keybindings: Keybinding[], hooks?: StepHooks): void {
        if (keybindings.length > 0) {
            this.scope.addStep(this.keybindingsStep(profileName, keybindings, hooks))
        }
    }

    tasks(profileName: string, tasks: Record<string, unknown>, hooks?: StepHooks): void {
        if (Object.keys(tasks).length > 0) {
            this.scope.addStep(this.tasksStep(profileName, tasks, hooks))
        }
    }

    mcp(profileName: string, mcp: Record<string, unknown>, hooks?: StepHooks): void {
        if (Object.keys(mcp).length > 0) {
            this.scope.addStep(this.mcpStep(profileName, mcp, hooks))
        }
    }

    languageSnippet(profileName: string, language: string, snippet: Record<string, unknown>, hooks?: StepHooks): void {
        this.scope.addStep(this.languageSnippetStep(profileName, language, snippet, hooks))
    }

    globalSnippets(profileName: string, snippets: Record<string, unknown>, hooks?: StepHooks): void {
        if (Object.keys(snippets).length > 0) {
            this.scope.addStep(this.globalSnippetsStep(profileName, snippets, hooks))
        }
    }

    /**
     * Shared factory for steps that simply compare a JSON file to a desired value
     * and overwrite it when they differ.
     */
    private makeJsonEqualStep(params: {
        id: string
        kind: string
        title: string
        filePath: string
        desired: unknown
        details: Record<string, unknown>
        hooks?: StepHooks
        setup?: () => void
    }): Step {
        const { id, kind, title, filePath, desired, details, hooks, setup } = params
        return {
            id,
            kind,
            title,
            hooks,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const existing = readJsonFile(filePath)
                if (JSON.stringify(existing) === JSON.stringify(desired)) {
                    return noopOrAdopt(applied, `${title} already correct`)
                }
                return { action: 'update', message: `will update ${title}`, changed: true }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    setup?.()
                    atomicWriteJson(filePath, desired)
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind, details })
                }
            },
        }
    }

    private profileStep(name: string, location: string, hooks?: StepHooks): Step {
        const id = `vscode.profile.${name}`
        const ensureProfileDirs = () => {
            fs.mkdirSync(profileDir(location), { recursive: true })
            fs.mkdirSync(profileGlobalStorageDir(location), { recursive: true })
        }
        return {
            id,
            kind: 'vscode.profile',
            title: `vscode profile ${name}`,
            hooks,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const storage = readJsonFile(STORAGE_PATH)
                const profiles = (storage.userDataProfiles as Array<{ name: string; location: string }>) ?? []
                const existing = profiles.find((p) => p.name === name)
                if (existing?.location === location) {
                    if (fs.existsSync(profileGlobalStorageDir(location))) {
                        return noopOrAdopt(applied, `profile ${name} already registered`)
                    }
                    return {
                        action: 'update',
                        message: `will create vscode profile ${name} global storage`,
                        changed: true,
                    }
                }
                return {
                    action: existing ? 'update' : 'create',
                    message: `will ${existing ? 'update' : 'create'} profile ${name}`,
                    changed: true,
                }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    const storage = readJsonFile(STORAGE_PATH)
                    const profiles = (storage.userDataProfiles as Array<{ name: string; location: string }>) ?? []
                    const idx = profiles.findIndex((p) => p.name === name)
                    const entry = { name, location }
                    if (idx >= 0) profiles[idx] = entry
                    else profiles.push(entry)
                    atomicWriteJson(STORAGE_PATH, { ...storage, userDataProfiles: profiles })
                    ensureProfileDirs()
                    await run(['code', ...profileArgs(name), '--list-extensions'])
                } else if (plan.action === 'noop' || plan.action === 'adopt') {
                    ensureProfileDirs()
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'vscode.profile', details: { name, location } })
                }
            },
        }
    }

    private settingsStep(name: string, mode: SettingsMode, values: Record<string, unknown>, hooks?: StepHooks): Step {
        const filePath = settingsPath(name)
        const id = `vscode.${name}.settings`
        return {
            id,
            kind: 'vscode.settings',
            title: `vscode ${name} settings (${mode})`,
            hooks,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                const existing = readJsonFile(filePath)
                if (mode === 'replace') {
                    if (JSON.stringify(existing) === JSON.stringify(values)) {
                        return noopOrAdopt(applied, `vscode ${name} settings already correct`)
                    }
                    return { action: 'update', message: `will replace vscode ${name} settings`, changed: true }
                }
                const { changedKeys } = jsonPatch(existing, values)
                if (changedKeys.length === 0) return noopOrAdopt(applied, `vscode ${name} settings already correct`)
                return {
                    action: 'update',
                    message: `will patch vscode ${name} settings (keys: ${changedKeys.join(', ')})`,
                    changed: true,
                }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create' || plan.action === 'update') {
                    const existing = readJsonFile(filePath)
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
                    atomicWriteJson(filePath, result)
                }
                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({
                        id,
                        kind: 'vscode.settings',
                        details: { path: filePath, mode, keys: Object.keys(values) },
                    })
                }
            },
        }
    }

    private extensionStep(profileName: string, extensionId: string): Step {
        const id = `vscode.${profileName}.extension.${extensionId}`

        return {
            id,
            kind: 'vscode.extension',
            title: `vscode ${profileName} extension ${extensionId}`,
            async plan(ctx: PlanContext): Promise<PlanResult> {
                const applied = await ctx.getAppliedState(id)
                if (getExtensions(profileName).has(extensionId.toLowerCase()))
                    return noopOrAdopt(applied, `${extensionId} already installed in ${profileName}`)
                return { action: 'create', message: `will install ${extensionId} in ${profileName}`, changed: true }
            },
            async apply(ctx: ApplyContext, plan: PlanResult): Promise<void> {
                if (plan.action === 'create') {
                    await run(['code', ...profileArgs(profileName), '--install-extension', extensionId])
                }

                if (shouldSave(plan.action)) {
                    await ctx.saveAppliedState({ id, kind: 'vscode.extension', details: { extensionId, profileName } })
                }
            },
        }
    }

    private keybindingsStep(name: string, keybindings: Keybinding[], hooks?: StepHooks): Step {
        const filePath = keybindingsPath(name)
        const id = `vscode.${name}.keybindings`
        const filtered = keybindings.map(({ key, command, when, args }) => {
            const entry: Record<string, unknown> = { key, command }
            if (when != null) entry.when = when
            if (args != null) entry.args = args
            return entry
        })
        return this.makeJsonEqualStep({
            id,
            kind: 'vscode.keybindings',
            title: `vscode ${name} keybindings`,
            filePath,
            desired: filtered,
            details: { path: filePath },
            hooks,
        })
    }

    private tasksStep(name: string, tasks: Record<string, unknown>, hooks?: StepHooks): Step {
        return this.makeJsonEqualStep({
            id: `vscode.${name}.tasks`,
            kind: 'vscode.tasks',
            title: `vscode ${name} tasks`,
            filePath: tasksPath(name),
            desired: tasks,
            details: { path: tasksPath(name) },
            hooks,
        })
    }

    private mcpStep(name: string, mcp: Record<string, unknown>, hooks?: StepHooks): Step {
        return this.makeJsonEqualStep({
            id: `vscode.${name}.mcp`,
            kind: 'vscode.mcp',
            title: `vscode ${name} mcp`,
            filePath: mcpPath(name),
            desired: mcp,
            details: { path: mcpPath(name) },
            hooks,
        })
    }

    private languageSnippetStep(
        profileName: string,
        language: string,
        snippet: Record<string, unknown>,
        hooks?: StepHooks,
    ): Step {
        const filePath = path.join(snippetsDir(profileName), `${language}.json`)
        return this.makeJsonEqualStep({
            id: `vscode.${profileName}.snippets.${language}`,
            kind: 'vscode.snippet',
            title: `vscode ${profileName} ${language} snippets`,
            filePath,
            desired: snippet,
            details: { path: filePath, language },
            hooks,
            setup: () => fs.mkdirSync(path.dirname(filePath), { recursive: true }),
        })
    }

    private globalSnippetsStep(profileName: string, snippets: Record<string, unknown>, hooks?: StepHooks): Step {
        const filePath = path.join(snippetsDir(profileName), 'global.code-snippets')
        return this.makeJsonEqualStep({
            id: `vscode.${profileName}.snippets.global`,
            kind: 'vscode.snippet',
            title: `vscode ${profileName} global snippets`,
            filePath,
            desired: snippets,
            details: { path: filePath },
            hooks,
            setup: () => fs.mkdirSync(path.dirname(filePath), { recursive: true }),
        })
    }
}
