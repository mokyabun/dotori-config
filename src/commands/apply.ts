import pc from 'picocolors'
import type { Queue } from '../context'
import { makeApplyContext, makePlanContext } from '../context'
import { runHooks } from '../hooks'
import type { ApplyContext, PlanContext, PlanResult, Step } from '../types'
import { colorAction, printGroupHeader } from '../utils/ui'

export async function runApply(queue: Queue, filterGroupId?: string): Promise<void> {
    const planCtx = makePlanContext()
    const applyCtx = makeApplyContext()

    for (const node of queue) {
        if (node.type === 'step') {
            if (filterGroupId) continue
            await applyStep(node.step, planCtx, applyCtx)
        } else {
            const { group } = node
            if (filterGroupId && group.id !== filterGroupId) continue
            printGroupHeader(group.id)
            let anyChanged = false
            for (const step of group.steps) {
                if (await applyStep(step, planCtx, applyCtx)) anyChanged = true
            }
            if (anyChanged && group.hooks?.afterChange) {
                console.log(pc.gray(`  running group afterChange hooks for ${group.id}`))
                await runHooks(group.hooks.afterChange)
            }
            if (group.hooks?.afterApply) {
                console.log(pc.gray(`  running group afterApply hooks for ${group.id}`))
                await runHooks(group.hooks.afterApply)
            }
        }
    }
}

async function applyStep(step: Step, planCtx: PlanContext, applyCtx: ApplyContext): Promise<boolean> {
    let plan: PlanResult
    try {
        plan = await step.plan(planCtx)
    } catch (e) {
        plan = { action: 'error', message: String(e), changed: false }
    }

    console.log(`  ${colorAction(plan.action)}  ${step.title}`)
    if (plan.action !== 'noop') {
        console.log(`    ${pc.gray(plan.message)}`)
    }

    if (plan.action === 'error' || plan.action === 'noop' || plan.action === 'preserve') {
        return false
    }

    try {
        await step.apply(applyCtx, plan)
    } catch (e) {
        console.error(pc.red(`    apply failed: ${e}`))
        return false
    }

    if (plan.changed && step.hooks?.afterChange) {
        await runHooks(step.hooks.afterChange)
    }
    if (step.hooks?.afterApply) {
        await runHooks(step.hooks.afterApply)
    }

    return plan.changed
}
