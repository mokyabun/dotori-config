return {
	-- Bundle IDs are stable even when an app's display name changes.
	bundleIds = {
		-- Built-in macOS apps
		-- "com.apple.AppStore", -- App Store
		"com.apple.Automator", -- Automator
		"com.apple.iBooksX", -- Books
		"com.apple.calculator", -- Calculator
		"com.apple.iCal", -- Calendar
		"com.apple.Chess", -- Chess
		"com.apple.clock", -- Clock
		-- "com.apple.AddressBook", -- Contacts
		"com.apple.Dictionary", -- Dictionary
		"com.apple.FaceTime", -- FaceTime
		"com.apple.findmy", -- Find My
		"com.apple.FontBook", -- Font Book
		"com.apple.freeform", -- Freeform
		"com.apple.Home", -- Home
		"com.apple.Image_Capture", -- Image Capture
		"com.apple.GenerativePlaygroundApp", -- Image Playground
		"com.apple.mail", -- Mail
		"com.apple.Maps", -- Maps
		-- "com.apple.MobileSMS", -- Messages
		"com.apple.Music", -- Music
		"com.apple.news", -- News
		"com.apple.Notes", -- Notes
		"com.apple.Passwords", -- Passwords
		"com.apple.PhotoBooth", -- Photo Booth
		-- "com.apple.Photos", -- Photos
		"com.apple.podcasts", -- Podcasts
		"com.apple.Preview", -- Preview
		"com.apple.QuickTimePlayerX", -- QuickTime Player
		"com.apple.reminders", -- Reminders
		"com.apple.Safari", -- Safari
		"com.apple.shortcuts", -- Shortcuts
		"com.apple.Stickies", -- Stickies
		"com.apple.stocks", -- Stocks
		"com.apple.systempreferences", -- System Settings
		"com.apple.TV", -- TV
		"com.apple.TextEdit", -- TextEdit
		"com.apple.helpviewer", -- Tips
		"com.apple.VoiceMemos", -- Voice Memos
		"com.apple.weather", -- Weather
		-- "com.apple.ScreenContinuity", -- iPhone Mirroring

		-- macOS desktop and launcher apps
		-- "com.apple.finder", -- Finder
		"com.apple.launchpad.launcher", -- Launchpad
		"com.apple.exposelauncher", -- Mission Control
		"com.apple.siri.launcher", -- Siri
		"com.apple.backup.launcher", -- Time Machine

		-- Built-in macOS utilities
		-- "com.apple.ActivityMonitor", -- Activity Monitor
		"com.apple.airport.airportutility", -- AirPort Utility
		"com.apple.audio.AudioMIDISetup", -- Audio MIDI Setup
		"com.apple.BluetoothFileExchange", -- Bluetooth File Exchange
		"com.apple.bootcampassistant", -- Boot Camp Assistant
		"com.apple.ColorSyncUtility", -- ColorSync Utility
		"com.apple.Console", -- Console
		"com.apple.DigitalColorMeter", -- Digital Color Meter
		-- "com.apple.DiskUtility", -- Disk Utility
		"com.apple.grapher", -- Grapher
		"com.apple.MigrateAssistant", -- Migration Assistant
		"com.apple.printcenter", -- Print Center
		-- "com.apple.ScreenSharing", -- Screen Sharing
		"com.apple.screenshot.launcher", -- Screenshot
		"com.apple.ScriptEditor2", -- Script Editor
		"com.apple.SystemProfiler", -- System Information
		"com.apple.Terminal", -- Terminal
		"com.apple.VoiceOverUtility", -- VoiceOver Utility

		-- Always-running menu bar utilities
		-- "org.hammerspoon.Hammerspoon", -- Hammerspoon
		-- "com.jordanbaird.Ice", -- Ice
		-- "com.lujjjh.LinearMouse", -- LinearMouse
		-- "com.thusvill.LiveWallpaper", -- LiveWallpaper
		-- "com.bitgapp.eqmac", -- eqMac
		-- "com.unicorn-soft.unicornhttpsformac", -- Unicorn HTTPS
	},

	-- Use the .app filename (without the extension) when a bundle ID is unknown.
	names = {
		-- "Some App",
	},
}
