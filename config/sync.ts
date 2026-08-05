import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.brew.cask('obsidian')
    ctx.brew.install('syncthing')

    ctx.launchd.agent('syncthing', {
        ProgramArguments: ['/usr/bin/env', 'syncthing', 'serve', '--no-browser', '--no-restart'],
        EnvironmentVariables: {
            PATH: '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin',
        },
        RunAtLoad: true,
        KeepAlive: true,
        ProcessType: 'Background',
    })
}
