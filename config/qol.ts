import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.brew.cask('discord')
    ctx.brew.cask('parsec')
    ctx.brew.cask('brave-browser')
    ctx.brew.cask('jordanbaird-ice')
    ctx.launchd.agent('ice', {
        ProgramArguments: ['/Applications/Ice.app/Contents/MacOS/Ice'],
        RunAtLoad: true,
        KeepAlive: true,
    })
    ctx.brew.cask('bambu-studio')
    ctx.brew.cask('blender')
    ctx.brew.cask('keka')
    ctx.brew.cask('iina')
}
