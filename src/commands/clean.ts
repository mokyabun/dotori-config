import fs from 'node:fs'
import os from 'node:os'
import pc from 'picocolors'
import type { Queue } from '../context'
import { deleteAppliedState, getAllAppliedStates } from '../db'
import { cleanBrewCask, cleanBrewFormula, cleanBrewTap, cleanBrewTrust } from '../providers/brew'
import { cleanSymlink, cleanTextBlock } from '../providers/file'
import { STORAGE_PATH } from '../providers/vscode/constants'
import { profileArgs, profileDir } from '../providers/vscode/utils'
import type { AppliedState } from '../types'
import { atomicWriteJson } from '../utils/atomic'
import { removeKeys } from '../utils/json'
import { readPlist, resolvePlistPath, writePlist } from '../utils/plist'

export async function runClean(queue: Queue, filterGroupId?: string): Promise<void> {
    const desiredIds = new Set<string>()
    for (const node of queue) {
        if (node.type === 'step') {
            if (!filterGroupId) desiredIds.add(node.step.id)
        } else if (!filterGroupId || node.group.id === filterGroupId) {
            for (const step of node.group.steps) desiredIds.add(step.id)
        }
    }

    const toClean = getAllAppliedStates().filter((s) => !desiredIds.has(s.id))

    if (toClean.length === 0) {
        console.log(pc.green('Nothing to clean.'))
        return
    }

    console.log(pc.bold(`Cleaning ${toClean.length} item(s)...`))
    for (const applied of toClean) {
        await cleanItem(applied)
    }
}

async function cleanItem(applied: AppliedState): Promise<void> {
    const d = applied.details ?? {}
    console.log(`  ${pc.red('remove')}  ${applied.id}`)

    try {
        switch (applied.kind) {
            case 'brew.formula':
                if (typeof d.name === 'string') await cleanBrewFormula(d.name)
                break

            case 'brew.cask':
                if (typeof d.name === 'string') await cleanBrewCask(d.name)
                break

            case 'brew.tap':
                if (typeof d.repo === 'string') await cleanBrewTap(d.repo)
                break

            case 'brew.trust.tap':
            case 'brew.trust.formula':
            case 'brew.trust.cask': {
                const { name } = d as { name?: string }
                const trustKind = applied.kind.replace('brew.trust.', '') as 'tap' | 'formula' | 'cask'
                if (name) await cleanBrewTrust(trustKind, name)
                break
            }

            case 'file.symlink': {
                const { path: linkPath, target } = d as { path?: string; target?: string }
                if (linkPath && target) cleanSymlink(linkPath, target)
                break
            }

            case 'file.block': {
                const { path: filePath, marker } = d as { path?: string; marker?: string }
                if (filePath && marker) cleanTextBlock(filePath, marker)
                break
            }

            case 'file.json': {
                const { mode, path: filePath, keys } = d as { mode?: string; path?: string; keys?: unknown }
                if (filePath) cleanJsonFile(filePath, mode, keys)
                break
            }

            case 'file.download': {
                const { path: filePath } = d as { path?: string }
                if (filePath) {
                    try {
                        fs.unlinkSync(filePath)
                    } catch {}
                }
                break
            }

            case 'vscode.settings': {
                const { mode, path: filePath, keys } = d as { mode?: string; path?: string; keys?: unknown }
                if (filePath) cleanJsonFile(filePath, mode, keys)
                break
            }

            case 'vscode.keybindings':
            case 'vscode.tasks':
            case 'vscode.mcp':
            case 'vscode.snippet': {
                const { path: filePath } = d as { path?: string }
                if (filePath) {
                    try {
                        fs.unlinkSync(filePath)
                    } catch {}
                }
                break
            }

            case 'vscode.extension': {
                const { extensionId, profileName } = d as { extensionId?: string; profileName?: string }
                if (extensionId)
                    Bun.spawnSync([
                        'code',
                        ...profileArgs(profileName ?? 'default'),
                        '--uninstall-extension',
                        extensionId,
                    ])
                break
            }

            case 'vscode.profile': {
                const { name, location } = d as { name?: string; location?: string }
                if (name) {
                    const storage = readJson(STORAGE_PATH)
                    const profiles = Array.isArray(storage.userDataProfiles) ? storage.userDataProfiles : []
                    atomicWriteJson(STORAGE_PATH, {
                        ...storage,
                        userDataProfiles: profiles.filter(
                            (p) => !(p && typeof p === 'object' && 'name' in p && p.name === name),
                        ),
                    })
                }
                if (location) {
                    try {
                        fs.rmSync(profileDir(location), { recursive: true, force: true })
                    } catch {}
                }
                break
            }

            case 'macos.defaults': {
                const { domain, keys } = d as { domain?: string; keys?: unknown }
                if (domain && Array.isArray(keys)) {
                    for (const key of keys as string[]) {
                        Bun.spawnSync(['defaults', 'delete', domain, key])
                    }
                } else {
                    console.log(pc.gray(`    skipping defaults clean for ${applied.id} (no domain/keys)`))
                }
                break
            }

            case 'macos.plist': {
                const {
                    domain,
                    path: plistFilePath,
                    keys,
                } = d as {
                    domain?: string
                    path?: string
                    keys?: unknown
                }
                if (Array.isArray(keys) && (domain || plistFilePath)) {
                    const resolvedPath = plistFilePath ?? resolvePlistPath(domain as string)
                    const existing = readPlist(resolvedPath)
                    for (const k of keys as string[]) delete existing[k]
                    writePlist(resolvedPath, existing)
                } else {
                    console.log(pc.gray(`    skipping plist clean for ${applied.id} (no domain/keys)`))
                }
                break
            }

            case 'launchd.agent': {
                const { label, path: plistPath } = d as { label?: string; path?: string }
                const target = `gui/${os.userInfo().uid}`
                if (plistPath) Bun.spawnSync(['launchctl', 'bootout', target, plistPath])
                else if (label) Bun.spawnSync(['launchctl', 'bootout', `${target}/${label}`])
                if (plistPath)
                    try {
                        fs.unlinkSync(plistPath)
                    } catch {}
                break
            }

            default:
                console.log(pc.gray(`    unknown kind ${applied.kind}, skipping`))
        }
    } catch (e) {
        console.error(pc.red(`    failed: ${e}`))
        return
    }

    deleteAppliedState(applied.id)
}

function readJson(filePath: string): Record<string, unknown> {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
        return {}
    }
}

function cleanJsonFile(filePath: string, mode?: string, keys?: unknown): void {
    if (mode === 'replace') {
        try {
            fs.unlinkSync(filePath)
        } catch {}
        return
    }

    if (Array.isArray(keys)) {
        const existing = readJson(filePath)
        atomicWriteJson(filePath, removeKeys(existing, keys as string[]))
    }
}
