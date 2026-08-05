import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.brew.install('git')
    ctx.file.block(
        '~/.gitconfig',
        'git',
        ['[user]', '    name = mokyabun', '    email = mokyabun@gmail.com', '[init]', '    defaultBranch = main'].join(
            '\n',
        ),
    )

    ctx.brew.install('biome')

    // Node
    ctx.brew.tap('oven-sh/bun')
    ctx.brew.trustFormula('oven-sh/bun/bun')
    ctx.brew.install('oven-sh/bun/bun')
    ctx.brew.install('node')

    // Python
    ctx.brew.install('uv')

    // Docker
    ctx.brew.cask('orbstack')

    // Terraform, Ansible
    ctx.brew.tap('hashicorp/tap')
    ctx.brew.trustFormula('hashicorp/tap/terraform')
    ctx.brew.install('terraform')
    ctx.brew.install('ansible')

    // Native/app toolchains
    ctx.brew.install('cocoapods')
}
