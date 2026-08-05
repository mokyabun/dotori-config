import type { Context } from '@mokyabun/dotori'

export default (ctx: Context) => {
    ctx.brew.cask('kitty')
    ctx.brew.cask('font-jetbrains-mono-nerd-font')

    ctx.file.symlink('~/.config/kitty', '../dotfiles/kitty')
}
