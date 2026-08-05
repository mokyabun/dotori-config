import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as plist from 'plist'
import { atomicWriteFile } from './atomic'
import { expandPath } from './path'

/**
 * Resolve a macOS plist domain or path to an absolute file path.
 * Bundle IDs like "com.apple.dock" → ~/Library/Preferences/com.apple.dock.plist
 * Paths starting with / or ~/ are used as-is.
 */
export function resolvePlistPath(domainOrPath: string): string {
    if (domainOrPath.startsWith('/') || domainOrPath.startsWith('~/')) {
        return expandPath(domainOrPath)
    }
    if (domainOrPath === 'NSGlobalDomain' || domainOrPath === '-g' || domainOrPath === 'Apple Global Domain') {
        return path.join(os.homedir(), 'Library', 'Preferences', '.GlobalPreferences.plist')
    }
    return path.join(os.homedir(), 'Library', 'Preferences', `${domainOrPath}.plist`)
}

/**
 * Read a plist file and return its contents as a JS object.
 * Handles both XML and binary plist formats via plist.js.
 */
export function readPlist(filePath: string): Record<string, unknown> {
    if (!fs.existsSync(filePath)) return {}
    try {
        const buf = fs.readFileSync(filePath)

        if (buf.slice(0, 6).toString() === 'bplist') {
            return plist.parseBinary(buf) as Record<string, unknown>
        }

        const parsed = plist.parse(buf.toString('binary'))

        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>
        }
        return {}
    } catch (e) {
        console.error(`Failed to read plist file at ${filePath}:`, e)
        return {}
    }
}

/**
 * Write a JS object to a plist file as XML plist (atomic write).
 */
export function writePlist(filePath: string, data: Record<string, unknown>): void {
    const xml = plist.build(data as plist.PlistValue)
    atomicWriteFile(filePath, xml)
}
