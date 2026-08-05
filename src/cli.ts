#!/usr/bin/env bun
import { cac } from 'cac'
import pc from 'picocolors'
import { z } from 'zod'
import { loadConfig, printPlan, runApply, runClean, runPlan } from './index'

const cli = cac('dotori')

const configOptionsSchema = z.object({
    config: z.string().default('config'),
})

function printError(error: unknown): void {
    console.error(pc.red(`Error: ${error instanceof Error ? error.message : String(error)}`))
}

function parseOptions<T>(schema: z.ZodType<T>, options: unknown): T {
    const result = schema.safeParse(options)
    if (result.success) return result.data

    console.error(pc.red('Invalid options'))
    for (const issue of result.error.issues) {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'options'
        console.error(pc.gray(`  ${path}: ${issue.message}`))
    }
    process.exit(1)
}

async function withConfig(
    groupId: string | undefined,
    options: unknown,
    handler: (queue: Awaited<ReturnType<typeof loadConfig>>, groupId?: string) => Promise<void> | void,
): Promise<void> {
    const opts = parseOptions(configOptionsSchema, options)
    try {
        const queue = await loadConfig(opts.config)
        await handler(queue, groupId)
    } catch (error) {
        printError(error)
        process.exit(1)
    }
}

cli.usage('[command] [options]').version('0.1.0').help()

cli.command('plan [groupId]', 'Show what would change')
    .option('-c, --config <path>', 'Config file path', { default: 'config' })
    .action((groupId: string | undefined, options: unknown) =>
        withConfig(groupId, options, async (queue, selectedGroupId) => {
            printPlan(await runPlan(queue, selectedGroupId))
        }),
    )

cli.command('apply [groupId]', 'Apply the configuration')
    .option('-c, --config <path>', 'Config file path', { default: 'config' })
    .action((groupId: string | undefined, options: unknown) =>
        withConfig(groupId, options, (queue, selectedGroupId) => runApply(queue, selectedGroupId)),
    )

cli.command('clean [groupId]', 'Remove resources no longer declared in config')
    .option('-c, --config <path>', 'Config file path', { default: 'config' })
    .action((groupId: string | undefined, options: unknown) =>
        withConfig(groupId, options, (queue, selectedGroupId) => runClean(queue, selectedGroupId)),
    )

cli.command('doctor', 'Check environment health').action(() => {
    const checks = [
        { name: 'brew', cmd: ['brew', '--version'] },
        { name: 'code (VSCode)', cmd: ['code', '--version'] },
        { name: 'plutil', cmd: ['plutil', '-help'] },
    ]

    for (const { name, cmd } of checks) {
        const { exitCode } = Bun.spawnSync(cmd)
        console.log(exitCode === 0 ? `${pc.green('ok')} ${name}` : `${pc.red('fail')} ${name}`)
    }
})

cli.parse()
