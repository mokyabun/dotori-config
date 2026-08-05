import { Database } from 'bun:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import type { AppliedState } from './types'
import { expandPath } from './utils/path'

// ── Migrations ────────────────────────────────────────────────────────────────

interface Migration {
    version: number
    up(db: Database): void
    down(db: Database): void
}

const migrations: Migration[] = [
    {
        version: 1,
        up(db) {
            db.run(`
                CREATE TABLE applied_state (
                    id         TEXT PRIMARY KEY,
                    kind       TEXT NOT NULL,
                    details    TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
            `)
        },
        down(db) {
            db.run('DROP TABLE applied_state')
        },
    },
]

function openDb(): Database {
    const dir = expandPath('~/.local/share/dotori')
    fs.mkdirSync(dir, { recursive: true })

    const db = new Database(path.join(dir, 'state.sqlite'))

    const versionRow = db.query<{ user_version: number }, []>('PRAGMA user_version').get()
    if (!versionRow) throw new Error('Failed to read database user_version')
    const { user_version: currentVersion } = versionRow

    // Legacy databases created before version tracking had user_version=0
    // but may already have the schema. Stamp them with the latest version
    // to skip migrations that would otherwise fail.
    if (currentVersion === 0) {
        const tableRow = db
            .query<{ count: number }, []>(
                "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='applied_state'",
            )
            .get()
        if (!tableRow) throw new Error('Failed to inspect database schema')
        const { count } = tableRow
        if (count > 0) {
            const latest = migrations.at(-1)?.version ?? 0
            db.run(`PRAGMA user_version = ${latest}`)
            return db
        }
    }

    for (const migration of migrations) {
        if (migration.version > currentVersion) {
            migration.up(db)
            db.run(`PRAGMA user_version = ${migration.version}`)
        }
    }

    return db
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _db: Database | null = null

function getDb(): Database {
    if (!_db) _db = openDb()
    return _db
}

// ── Row mapping ───────────────────────────────────────────────────────────────

interface StateRow {
    id: string
    kind: string
    details: string | null
    created_at: string
    updated_at: string
}

function toAppliedState(row: StateRow): AppliedState {
    return {
        id: row.id,
        kind: row.kind,
        details: row.details ? JSON.parse(row.details) : undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getAppliedState(id: string): AppliedState | undefined {
    const row = getDb().query<StateRow, [string]>('SELECT * FROM applied_state WHERE id = ?').get(id)
    return row ? toAppliedState(row) : undefined
}

export function getAllAppliedStates(): AppliedState[] {
    return getDb().query<StateRow, []>('SELECT * FROM applied_state').all().map(toAppliedState)
}

export function saveAppliedState(state: Omit<AppliedState, 'createdAt' | 'updatedAt'>): void {
    const now = new Date().toISOString()
    const existing = getAppliedState(state.id)
    getDb().run(
        `INSERT OR REPLACE INTO applied_state (id, kind, details, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
            state.id,
            state.kind,
            state.details != null ? JSON.stringify(state.details) : null,
            existing?.createdAt ?? now,
            now,
        ],
    )
}

export function deleteAppliedState(id: string): void {
    getDb().run('DELETE FROM applied_state WHERE id = ?', [id])
}

/** Roll back all migrations down to (but not including) targetVersion. */
export function migrateDown(targetVersion: number): void {
    const db = getDb()
    const versionRow = db.query<{ user_version: number }, []>('PRAGMA user_version').get()
    if (!versionRow) throw new Error('Failed to read database user_version')
    const { user_version: current } = versionRow

    const toRun = migrations
        .filter((m) => m.version <= current && m.version > targetVersion)
        .sort((a, b) => b.version - a.version)

    for (const migration of toRun) {
        migration.down(db)
        db.run(`PRAGMA user_version = ${migration.version - 1}`)
    }
}

export function closeDb(): void {
    _db?.close()
    _db = null
}
