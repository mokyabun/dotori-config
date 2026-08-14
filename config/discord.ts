import path from 'node:path'
import type { Context, StepHooks } from '@mokyabun/dotori'

export const discordHooks = {
    afterApply: [['/bin/sh', path.join(import.meta.dir, 'install-vencord.sh')]],
} satisfies StepHooks

export default (ctx: Context) => {
    // Vencord does not publish a macOS CLI binary, so its official installer is built from source.
    ctx.brew.install('go')
    ctx.brew.cask('discord')
}
