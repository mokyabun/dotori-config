import type { HookCommand } from './types'
import { run } from './utils/shell'

function resolveCommand(hook: HookCommand): string[] {
    if (typeof hook === 'string') return hook.split(' ')
    if (Array.isArray(hook)) return hook
    return hook.command
}

export async function runHooks(hooks: HookCommand[]): Promise<void> {
    for (const hook of hooks) {
        await run(resolveCommand(hook))
    }
}
