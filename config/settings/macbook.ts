import type { Context } from 'dotori'

const fnGlobeToLeftControlMapping = JSON.stringify({
    UserKeyMapping: [
        {
            // Fn/Globe key.
            HIDKeyboardModifierMappingSrc: 0xff00000003,

            // Left Control key.
            HIDKeyboardModifierMappingDst: 0x7000000e0,
        },
    ],
})

export default (ctx: Context) => {
    ctx.launchd.agent('macbook-fn-globe-to-control', {
        // MacBook only override: Keyboard > Keyboard Shortcuts > Modifier Keys > Globe key -> Control.
        // Apple exposes this remap in System Settings; hidutil makes the same remap reproducible at login.
        ProgramArguments: ['/usr/bin/hidutil', 'property', '--set', fnGlobeToLeftControlMapping],
        RunAtLoad: true,
        ProcessType: 'Background',
    })
}
