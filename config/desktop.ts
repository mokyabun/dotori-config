import os from 'node:os'
import type { Context } from 'dotori'

export default (ctx: Context) => {
    const home = os.homedir()
    const launchdPath = '/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin'
    const yabaiConfig = `${home}/.config/yabai/yabairc`
    const skhdConfig = `${home}/.config/skhd/skhdrc`
    const waitForConfig = (config: string, command: string[]) => [
        '/bin/sh',
        '-c',
        'config=$1; shift; until [ -r "$config" ]; do /bin/sleep 1; done; exec "$@"',
        'dotori-wait-for-config',
        config,
        ...command,
    ]

    ctx.brew.tap('thusvill/livewallpaper')
    ctx.brew.trustCask('thusvill/livewallpaper/livewallpaper')
    ctx.brew.cask('livewallpaper')

    // yabai + skhd
    ctx.brew.tap('koekeishiya/formulae')
    ctx.brew.install('koekeishiya/formulae/yabai')
    ctx.brew.install('koekeishiya/formulae/skhd')
    ctx.file.symlink('~/.config/yabai', '../dotfiles/yabai')
    ctx.file.symlink('~/.config/skhd', '../dotfiles/skhd')
    ctx.launchd.agent('yabai', {
        ProgramArguments: waitForConfig(yabaiConfig, ['/opt/homebrew/bin/yabai', '--config', yabaiConfig]),
        EnvironmentVariables: {
            PATH: launchdPath,
        },
        StandardOutPath: `${home}/Library/Logs/yabai.out.log`,
        StandardErrorPath: `${home}/Library/Logs/yabai.err.log`,
        ProcessType: 'Interactive',
        RunAtLoad: true,
        KeepAlive: true,
    })
    ctx.launchd.agent('skhd', {
        ProgramArguments: waitForConfig(skhdConfig, ['/opt/homebrew/bin/skhd', '-c', skhdConfig]),
        EnvironmentVariables: {
            PATH: launchdPath,
        },
        StandardOutPath: `${home}/Library/Logs/skhd.out.log`,
        StandardErrorPath: `${home}/Library/Logs/skhd.err.log`,
        ProcessType: 'Interactive',
        RunAtLoad: true,
        KeepAlive: true,
    })

    // Dependencies for Hammerspoon
    ctx.brew.cask('font-jetbrains-mono-nerd-font')
    ctx.brew.install('macmon')

    // Hammerspoon
    ctx.brew.cask('hammerspoon')
    ctx.file.symlink('~/.config/hammerspoon', '../dotfiles/hammerspoon')

    const hostname = process.env.HOSTNAME || os.hostname()
    const hammerspoonProfile = hostname.toLowerCase().includes('macmini') ? 'macmini' : 'macbook'
    const hammerspoonConfig = `${home}/.config/hammerspoon/${hammerspoonProfile}_init.lua`
    ctx.macos.defaults('hammerspoon', 'org.hammerspoon.Hammerspoon', {
        MJConfigFile: hammerspoonConfig,
    })
    ctx.launchd.agent('hammerspoon', {
        ProgramArguments: waitForConfig(hammerspoonConfig, [
            '/Applications/Hammerspoon.app/Contents/MacOS/Hammerspoon',
        ]),
        RunAtLoad: true,
        KeepAlive: true,
    })

    // Jankeyborder
    ctx.brew.tap('felixkratz/formulae')
    ctx.brew.trustFormula('felixkratz/formulae/borders')
    ctx.brew.install('borders')
    ctx.launchd.agent('jankeyborder', {
        ProgramArguments: [
            '/opt/homebrew/bin/borders',
            'active_color=0xff7287fd',
            'inactive_color=0x00000000',
            'width=7.0',
        ],
        RunAtLoad: true,
        KeepAlive: true,
    })
}
