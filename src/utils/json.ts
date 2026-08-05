/**
 * Deep merge source into target. Returns new object.
 * Only plain objects are deep-merged; arrays and primitives are replaced.
 */
export function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target }
    for (const [key, value] of Object.entries(source)) {
        if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>)
        } else {
            result[key] = value
        }
    }
    return result
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
    return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Apply a JSON patch (partial update) to an existing object.
 * Returns { result, changedKeys } where changedKeys are top-level keys that changed.
 */
export function jsonPatch(
    existing: Record<string, unknown>,
    patch: Record<string, unknown>,
): { result: Record<string, unknown>; changedKeys: string[] } {
    const result = deepMerge(existing, patch)
    const changedKeys = Object.keys(patch).filter((k) => JSON.stringify(existing[k]) !== JSON.stringify(result[k]))
    return { result, changedKeys }
}

/**
 * Remove keys from an object. Returns new object.
 */
export function removeKeys(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
    const result = { ...obj }
    for (const key of keys) {
        delete result[key]
    }
    return result
}

export function stableJsonStringify(value: unknown): string {
    return JSON.stringify(normalizeJson(value))
}

function normalizeJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalizeJson)
    if (!isPlainObject(value)) return value

    return Object.fromEntries(
        Object.entries(value)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, val]) => [key, normalizeJson(val)]),
    )
}
