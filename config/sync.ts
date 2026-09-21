import type { Context } from '@mokyabun/dotori'

export default (ctx: Context) => {
    ctx.brew.cask('obsidian')
    ctx.brew.install('syncthing')
}
