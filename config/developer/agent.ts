import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.brew.cask('claude-code')
    ctx.brew.cask('codex')
    ctx.brew.cask('chatgpt')

    ctx.brew.install('poppler')
    ctx.brew.install('qpdf')
    ctx.brew.install('ghostscript')
    ctx.brew.install('imagemagick')
    ctx.brew.install('ffmpeg')
    ctx.brew.install('pandoc')
    ctx.brew.install('exiftool')
    ctx.brew.install('tesseract')
}
