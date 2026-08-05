import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.macos.plist('screenshots', 'com.apple.screencapture', {
        mode: 'patch',
        values: {
            // Screenshot options: remove the drop shadow from captured windows.
            'disable-shadow': true,
        },
    })
}
