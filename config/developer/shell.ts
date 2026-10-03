import type { Context } from '@mokyabun/dotori'

function bat(ctx: Context) {
    ctx.brew.install('bat')

    // Dracula ships with bat, so no theme download / cache rebuild is needed.
    ctx.file.block('~/.config/bat/config', 'bat', '--theme="Dracula"\n--style="numbers,changes,header"')
}

export default (ctx: Context) => {
    // CLI tools
    ctx.brew.install('fd')
    ctx.brew.install('ripgrep')
    ctx.brew.install('jq')
    ctx.brew.install('mole')
    ctx.brew.install('rsync')

    // Human-facing shell UX
    ctx.brew.install('fish')
    ctx.brew.install('starship')
    ctx.brew.install('eza')
    ctx.brew.install('fzf')

    ctx.brew.install('smartmontools')

    ctx.file.symlink('~/.config/shell', '../dotfiles/shell')
    ctx.file.symlink('~/.config/fish', '../dotfiles/fish')
    ctx.file.symlink('~/.config/starship.toml', '../dotfiles/shell/starship.toml')

    // Keep zsh as the plain system/default shell. Terminal apps opt into fish.
    ctx.file.block('~/.zshrc', 'shell', 'source ~/.config/shell/shell.zsh')

    ctx.group('development/shell/bat', bat)
}
