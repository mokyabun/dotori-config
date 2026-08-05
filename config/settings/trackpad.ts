import type { Context } from 'dotori'

export default (ctx: Context) => {
    ctx.macos.plist('trackpad.built-in', 'com.apple.AppleMultitouchTrackpad', {
        mode: 'patch',
        values: {
            // Trackpad > Point & Click > Tap to click
            Clicking: 1,

            // Trackpad > Point & Click > Secondary click
            TrackpadRightClick: true,

            // Trackpad > Point & Click > Look up & data detectors
            TrackpadThreeFingerTapGesture: 0,

            // Trackpad > Scroll & Zoom > Natural scrolling
            TrackpadScroll: true,

            // Trackpad > Scroll & Zoom > Zoom in or out
            TrackpadPinch: 1,

            // Trackpad > Scroll & Zoom > Rotate
            TrackpadRotate: 1,

            // Trackpad > More Gestures > Swipe between pages
            TrackpadThreeFingerHorizSwipeGesture: 2,

            // Trackpad > More Gestures > Swipe between full-screen applications
            TrackpadFourFingerHorizSwipeGesture: 2,

            // Trackpad > More Gestures > Mission Control
            TrackpadFourFingerVertSwipeGesture: 2,

            // Trackpad > More Gestures > App Expose
            TrackpadThreeFingerVertSwipeGesture: 2,

            // Trackpad > More Gestures > Launchpad
            TrackpadFourFingerPinchGesture: 2,

            // Trackpad > More Gestures > Show Desktop
            TrackpadFiveFingerPinchGesture: 2,

            // Accessibility > Pointer Control > Trackpad Options > Use trackpad for dragging > Three Finger Drag
            TrackpadThreeFingerDrag: true,

            // Trackpad > Point & Click > Force Click and haptic feedback
            ForceSuppressed: false,
        },
    })

    ctx.macos.plist('trackpad.bluetooth', 'com.apple.driver.AppleBluetoothMultitouch.trackpad', {
        mode: 'patch',
        values: {
            // External Apple trackpad > Point & Click > Tap to click
            Clicking: 1,

            // External Apple trackpad > Point & Click > Secondary click
            TrackpadRightClick: true,

            // External Apple trackpad > Point & Click > Look up & data detectors
            TrackpadThreeFingerTapGesture: 0,

            // External Apple trackpad > Scroll & Zoom > Natural scrolling
            TrackpadScroll: true,

            // External Apple trackpad > Scroll & Zoom > Zoom in or out
            TrackpadPinch: 1,

            // External Apple trackpad > Scroll & Zoom > Rotate
            TrackpadRotate: 1,

            // External Apple trackpad > More Gestures > Swipe between pages
            TrackpadThreeFingerHorizSwipeGesture: 2,

            // External Apple trackpad > More Gestures > Swipe between full-screen applications
            TrackpadFourFingerHorizSwipeGesture: 2,

            // External Apple trackpad > More Gestures > Mission Control
            TrackpadFourFingerVertSwipeGesture: 2,

            // External Apple trackpad > More Gestures > App Expose
            TrackpadThreeFingerVertSwipeGesture: 2,

            // External Apple trackpad > More Gestures > Launchpad
            TrackpadFourFingerPinchGesture: 2,

            // External Apple trackpad > More Gestures > Show Desktop
            TrackpadFiveFingerPinchGesture: 2,

            // External Apple trackpad current state: three-finger drag is off.
            TrackpadThreeFingerDrag: false,
        },
    })

    ctx.macos.plist('trackpad.global', 'NSGlobalDomain', {
        mode: 'patch',
        values: {
            // Trackpad > Point & Click > Tap to click
            'com.apple.mouse.tapBehavior': 1,

            // Trackpad > Point & Click > Force Click and haptic feedback
            'com.apple.trackpad.forceClick': true,
        },
    })
}
