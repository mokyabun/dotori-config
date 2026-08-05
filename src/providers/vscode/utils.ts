import fs from 'node:fs'
import path from 'node:path'
import { VSCODE_USER_DIR } from './constants'

export function profileArgs(profileName: string): string[] {
    return profileName === 'default' ? [] : ['--profile', profileName]
}

export function readJsonFile(filePath: string): Record<string, unknown> {
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'))
    } catch {
        return {}
    }
}

export function profileDir(name: string): string {
    return path.join(VSCODE_USER_DIR, 'profiles', name)
}

export function profileGlobalStorageDir(name: string): string {
    return path.join(profileDir(name), 'globalStorage')
}

export function settingsPath(name: string): string {
    return name === 'default'
        ? path.join(VSCODE_USER_DIR, 'settings.json')
        : path.join(profileDir(name), 'settings.json')
}

export function keybindingsPath(name: string): string {
    return name === 'default'
        ? path.join(VSCODE_USER_DIR, 'keybindings.json')
        : path.join(profileDir(name), 'keybindings.json')
}

export function tasksPath(name: string): string {
    return name === 'default' ? path.join(VSCODE_USER_DIR, 'tasks.json') : path.join(profileDir(name), 'tasks.json')
}

export function mcpPath(name: string): string {
    return name === 'default' ? path.join(VSCODE_USER_DIR, 'mcp.json') : path.join(profileDir(name), 'mcp.json')
}

export function snippetsDir(name: string): string {
    return name === 'default' ? path.join(VSCODE_USER_DIR, 'snippets') : path.join(profileDir(name), 'snippets')
}
