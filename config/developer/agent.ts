import type { Context } from '@mokyabun/dotori'

export default (ctx: Context) => {
    ctx.brew.cask('claude-code')
    ctx.brew.cask('chatgpt')

    ctx.brew.install('poppler')
    ctx.brew.install('imagemagick')
    ctx.brew.install('ffmpeg')
}
