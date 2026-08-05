import type { AppliedState, PlanAction, PlanResult } from '../types'

/**
 * Returns true if the applied state should be persisted after this action.
 * noop, preserve, and error actions should never overwrite saved state.
 */
export function shouldSave(action: PlanAction): boolean {
    return action !== 'noop' && action !== 'preserve' && action !== 'error'
}

/**
 * Returns a `noop` result if the step was previously applied, otherwise `adopt`.
 * The adopt message automatically appends " (adopt)" to the base message.
 */
export function noopOrAdopt(applied: AppliedState | undefined, msg: string): PlanResult {
    return applied
        ? { action: 'noop', message: msg, changed: false }
        : { action: 'adopt', message: `${msg} (adopt)`, changed: false }
}
