import type { Context } from 'dotori'

// macOS Sequoia 15.7.7 기준으로 현재 Desktop & Dock / Mission Control 상태를 보존한다.
// Apple Support: https://support.apple.com/guide/mac-help/change-desktop-dock-settings-mchlp1119/mac
// Apple MDM Dock keys: https://developer.apple.com/documentation/devicemanagement/dock
export default (ctx: Context) => {
    ctx.macos.plist('desktop-and-dock.dock', 'com.apple.dock', {
        mode: 'patch',
        values: {
            // Dock > Automatically hide and show the Dock
            autohide: true,

            // Dock > Show suggested and recent apps in Dock
            'show-recents': false,

            // Dock > Show indicators for open applications
            'show-process-indicators': false,

            // Dock contents: keep only explicitly pinned/static Dock items visible.
            'static-only': true,

            // Dock > Size
            tilesize: 64,

            // Mission Control > Automatically rearrange Spaces based on most recent use
            'mru-spaces': false,

            // Mission Control shortcut affordance: do not enter Mission Control by dragging a window to the top edge.
            enterMissionControlByTopWindowDrag: false,
        },
        afterChange: [['killall', 'Dock']],
    })

    ctx.macos.plist('desktop-and-dock.window-manager', 'com.apple.WindowManager', {
        mode: 'patch',
        values: {
            // Desktop & Dock > Show Desktop > Only in Stage Manager on Click
            // Public write-up for the backing key: https://derflounder.wordpress.com/2023/09/26/managing-the-click-wallpaper-to-reveal-desktop-setting-in-macos-sonoma/
            EnableStandardClickToShowDesktop: false,

            // Desktop & Dock > Show Items > On Desktop
            // yabai requires desktop items to remain enabled for reliable empty-Space focus.
            StandardHideDesktopIcons: false,

            // Desktop & Dock > Widgets > Show Widgets > On Desktop
            StandardHideWidgets: true,

            // Desktop & Dock > Widgets > Show Widgets > In Stage Manager
            StageManagerHideWidgets: true,

            // Desktop & Dock > Stage Manager recent apps strip auto-hide state.
            AutoHide: true,

            // Desktop & Dock > Stage Manager > Show windows from an application.
            AppWindowGroupingBehavior: 1,

            // Desktop & Dock > Tiled windows have margins
            EnableTiledWindowMargins: false,

            // Desktop & Dock > Drag windows to screen edges to tile
            EnableTilingByEdgeDrag: false,

            // Desktop & Dock > Hold Option key while dragging windows to tile
            EnableTilingOptionAccelerator: false,

            // Desktop & Dock > Drag windows to menu bar to fill screen
            EnableTopTilingByEdgeDrag: false,
        },
        afterChange: [['killall', 'WindowManager']],
    })

    ctx.macos.plist('desktop-and-dock.global', 'NSGlobalDomain', {
        mode: 'patch',
        values: {
            // Dock > Window title bar double-click action > No Action
            AppleActionOnDoubleClick: 'None',

            // Dock > Window title bar double-click action is not "Minimize".
            AppleMiniaturizeOnDoubleClick: false,

            // Menu Bar > Automatically hide and show the menu bar > In Full Screen Only
            AppleMenuBarVisibleInFullscreen: false,

            // Mission Control > When switching to an application, switch to a Space with open windows for the application
            AppleSpacesSwitchOnActivate: false,
        },
    })

    ctx.macos.plist('desktop-and-dock.spaces', 'com.apple.spaces', {
        mode: 'patch',
        values: {
            // Mission Control > Displays have separate Spaces
            'spans-displays': false,
        },
    })
}
