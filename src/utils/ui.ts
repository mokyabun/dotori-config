import pc from 'picocolors'
import type { PlanAction } from '../types'

const ACTION_COLORS: Record<PlanAction, (s: string) => string> = {
    noop: pc.gray,
    adopt: pc.blue,
    create: pc.green,
    update: pc.yellow,
    remove: pc.red,
    preserve: pc.magenta,
    error: (s) => pc.bgRed(pc.white(s)),
}

export function colorAction(action: PlanAction): string {
    return ACTION_COLORS[action](action)
}

export function printGroupHeader(id: string): void {
    console.log(pc.bold(pc.cyan(`\n[group: ${id}]`)))
}
