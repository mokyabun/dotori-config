import type { Context } from '@mokyabun/dotori'

export default (ctx: Context) => {
    ctx.brew.cask('ghostty')
    ctx.brew.cask('font-jetbrains-mono-nerd-font')
    ctx.brew.cask('font-d2coding')

    ctx.file.symlink('~/.config/ghostty', '../dotfiles/ghostty')
    ctx.file.symlink('~/.config/zellij', '../dotfiles/zellij')
}
