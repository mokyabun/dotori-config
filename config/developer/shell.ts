import type { Context } from 'dotori'

function bat(ctx: Context) {
    ctx.brew.install('bat')

    ctx.file.block('~/.config/bat/config', 'bat', '--theme="Catppuccin Latte"\n--style="numbers,changes,header"')

    // bat themes
    const BAT_THEMES_DIR = '~/.config/bat/themes'
    const BAT_THEME_BASE = 'https://github.com/catppuccin/bat/raw/main/themes'

    for (const name of ['Catppuccin Latte']) {
        ctx.file.download(`${BAT_THEMES_DIR}/${name}.tmTheme`, `${BAT_THEME_BASE}/${encodeURIComponent(name)}.tmTheme`)
    }
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

    ctx.file.symlink('~/.config/shell', '../dotfiles/shell')
    ctx.file.symlink('~/.config/fish', '../dotfiles/fish')
    ctx.file.symlink('~/.config/starship.toml', '../dotfiles/shell/starship.toml')

    // Keep zsh as the plain system/default shell. Terminal apps opt into fish.
    ctx.file.block('~/.zshrc', 'shell', 'source ~/.config/shell/shell.zsh')

    ctx.group('development/shell/bat', bat, {
        hooks: {
            afterChange: [{ command: ['bat', 'cache', '--build'], description: 'rebuild bat theme cache' }],
        },
    })
}
