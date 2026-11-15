import os from 'node:os'
import type { Context } from '@mokyabun/dotori'

export default (ctx: Context) => {
    const home = os.homedir()

    // yabai + skhd
    ctx.brew.tap('koekeishiya/formulae')
    ctx.brew.install('koekeishiya/formulae/yabai')
    ctx.brew.install('koekeishiya/formulae/skhd')
    ctx.file.symlink('~/.config/yabai', '../dotfiles/yabai')
    ctx.file.symlink('~/.config/skhd', '../dotfiles/skhd')

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

    // Jankeyborder
    ctx.brew.tap('felixkratz/formulae')
    ctx.brew.trustFormula('felixkratz/formulae/borders')

    ctx.brew.install('borders')
    ctx.file.symlink('~/.config/borders', '../dotfiles/borders')
}
