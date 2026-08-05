import { z } from 'zod'

export type PlanAction = 'noop' | 'create' | 'update' | 'remove' | 'adopt' | 'preserve' | 'error'

export type MaybePromise<T> = T | Promise<T>

export interface PlanResult {
    action: PlanAction
    message: string
    changed: boolean
    data?: unknown
}

export const HookCommandSchema = z.union([
    z.string(),
    z.array(z.string()),
    z.object({ command: z.array(z.string()), description: z.string().optional() }),
])

export const StepHooksSchema = z.object({
    afterChange: z.array(HookCommandSchema).optional(),
    afterApply: z.array(HookCommandSchema).optional(),
})

export type HookCommand = z.infer<typeof HookCommandSchema>
export type StepHooks = z.infer<typeof StepHooksSchema>

export interface Step {
    id: string
    kind: string
    title: string
    hooks?: StepHooks
    plan(ctx: PlanContext): Promise<PlanResult>
    apply(ctx: ApplyContext, plan: PlanResult): Promise<void>
}

export interface DotoriEnv {
    username: string
}

export interface ProviderScope {
    addStep(step: Step): void
    configCwd: string
    env: DotoriEnv
}

export interface StepGroup {
    id: string
    title?: string
    steps: Step[]
    hooks?: StepHooks
}

export type QueueNode = { type: 'step'; step: Step } | { type: 'group'; group: StepGroup }

export interface AppliedState {
    id: string
    kind: string
    details?: Record<string, unknown>
    createdAt: string
    updatedAt: string
}

export interface PlanContext {
    getAppliedState(id: string): Promise<AppliedState | undefined>
}

export interface ApplyContext {
    getAppliedState(id: string): Promise<AppliedState | undefined>
    saveAppliedState(state: Omit<AppliedState, 'createdAt' | 'updatedAt'>): Promise<void>
    deleteAppliedState(id: string): Promise<void>
}
