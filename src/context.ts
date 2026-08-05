import os from 'node:os'
import * as db from './db'
import { createDefaultProviders, type DotoriProviders } from './providers'
import type {
    ApplyContext,
    DotoriEnv,
    PlanContext,
    ProviderScope,
    QueueNode,
    Step,
    StepGroup,
    StepHooks,
} from './types'

export type Queue = QueueNode[]

export type DotoriProviderFactory<TProviders extends Record<string, unknown> = Record<string, unknown>> = (
    scope: ProviderScope,
) => TProviders

export interface DotoriOptions {
    configCwd: string
    env?: Partial<DotoriEnv>
    providers?: DotoriProviderFactory[]
}

export interface DotoriContext extends DotoriProviders {
    env: DotoriEnv
    group(id: string, fn: (g: DotoriContext) => void, options?: { hooks?: StepHooks }): void
}

export type Context = DotoriContext

export interface DotoriRuntime {
    context: DotoriContext
    queue: Queue
}

export function makePlanContext(): PlanContext {
    return {
        getAppliedState(id) {
            return Promise.resolve(db.getAppliedState(id))
        },
    }
}

export function makeApplyContext(): ApplyContext {
    return {
        getAppliedState(id) {
            return Promise.resolve(db.getAppliedState(id))
        },
        saveAppliedState(state) {
            db.saveAppliedState(state)
            return Promise.resolve()
        },
        deleteAppliedState(id) {
            db.deleteAppliedState(id)
            return Promise.resolve()
        },
    }
}

export function createDotori(options: DotoriOptions): DotoriRuntime {
    const queue: Queue = []
    const env: DotoriEnv = {
        username: os.userInfo().username,
        ...options.env,
    }
    const providerFactories = options.providers ?? [createDefaultProviders]

    function buildCtx(addStep: (step: Step) => void): DotoriContext {
        const scope: ProviderScope = {
            addStep,
            configCwd: options.configCwd,
            env,
        }
        const providers = Object.assign({}, ...providerFactories.map((factory) => factory(scope))) as DotoriProviders

        return {
            ...providers,
            env,
            group(id, fn, options) {
                const steps: Step[] = []
                fn(buildCtx((step) => steps.push(step)))
                const group: StepGroup = { id, steps, hooks: options?.hooks }
                queue.push({ type: 'group', group })
            },
        }
    }

    return {
        context: buildCtx((step) => queue.push({ type: 'step', step })),
        queue,
    }
}
