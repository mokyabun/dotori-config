import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.brew.cask('linearmouse')
    ctx.launchd.agent('linearmouse', {
        ProgramArguments: ['/Applications/LinearMouse.app/Contents/MacOS/LinearMouse'],
        RunAtLoad: true,
        KeepAlive: true,
    })
}
