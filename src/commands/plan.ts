import pc from 'picocolors'
import type { Queue } from '../context'
import { makePlanContext } from '../context'
import type { PlanContext, PlanResult, Step, StepGroup } from '../types'
import { colorAction, printGroupHeader } from '../utils/ui'

export interface StepPlanResult {
    step: Step
    plan: PlanResult
}

export interface GroupPlanResult {
    group: StepGroup
    steps: StepPlanResult[]
}

export type PlanOutput = { type: 'step'; result: StepPlanResult } | { type: 'group'; result: GroupPlanResult }

export async function runPlan(queue: Queue, filterGroupId?: string): Promise<PlanOutput[]> {
    const ctx = makePlanContext()
    const outputs: PlanOutput[] = []

    for (const node of queue) {
        if (node.type === 'step') {
            if (filterGroupId) continue
            outputs.push({ type: 'step', result: { step: node.step, plan: await safePlan(node.step, ctx) } })
        } else {
            const { group } = node
            if (filterGroupId && group.id !== filterGroupId) continue
            const steps: StepPlanResult[] = []
            for (const step of group.steps) {
                steps.push({ step, plan: await safePlan(step, ctx) })
            }
            outputs.push({ type: 'group', result: { group, steps } })
        }
    }

    return outputs
}

async function safePlan(step: Step, ctx: PlanContext): Promise<PlanResult> {
    try {
        return await step.plan(ctx)
    } catch (e) {
        return { action: 'error', message: String(e), changed: false }
    }
}

export function printPlan(outputs: PlanOutput[]): void {
    for (const output of outputs) {
        if (output.type === 'step') {
            printStepResult(output.result.step.title, output.result.plan)
        } else {
            const { group, steps } = output.result
            printGroupHeader(group.id)
            for (const { step, plan } of steps) {
                printStepResult(step.title, plan, '  ')
            }
        }
    }
}

function printStepResult(title: string, plan: PlanResult, indent = ''): void {
    console.log(`${indent}${colorAction(plan.action)}  ${title}`)
    console.log(`${indent}  ${pc.gray(plan.message)}`)
}
