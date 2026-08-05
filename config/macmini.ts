import type { Context } from '@mokyabun/dotori'

export default (ctx: Context) => {
    ctx.brew.cask('linearmouse')
    ctx.launchd.agent('linearmouse', {
        ProgramArguments: ['/Applications/LinearMouse.app/Contents/MacOS/LinearMouse'],
        RunAtLoad: true,
        KeepAlive: true,
    })
}
