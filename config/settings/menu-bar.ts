import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.macos.plist('menu-bar.control-center', 'com.apple.controlcenter', {
        mode: 'patch',
        values: {
            // Control Center > Wi-Fi > Show in Menu Bar
            'NSStatusItem Visible WiFi': true,

            // Control Center > Bluetooth > Show in Menu Bar
            'NSStatusItem Visible Bluetooth': true,

            // Control Center > Battery / Energy Mode > Show in Menu Bar
            'NSStatusItem Visible EnergyModeModule': true,

            // Control Center > Now Playing > Show in Menu Bar
            'NSStatusItem Visible NowPlaying': false,

            // Control Center > Screen Mirroring > Show in Menu Bar
            'NSStatusItem Visible ScreenMirroring': false,

            // Control Center > Sound / Video effects menu extra
            'NSStatusItem Visible AudioVideoModule': false,

            // Control Center > Control Center icon visibility
            'NSStatusItem Visible BentoBox': true,
        },
    })

    ctx.macos.plist('menu-bar.clock', 'com.apple.menuextra.clock', {
        mode: 'patch',
        values: {
            // Control Center > Clock Options > Show AM/PM
            ShowAMPM: true,

            // Control Center > Clock Options > Show day of the week
            ShowDayOfWeek: true,

            // Control Center > Clock Options > Show date
            ShowDate: 0,
        },
    })
}
