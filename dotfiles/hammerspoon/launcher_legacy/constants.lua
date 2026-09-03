local colors = require("lib.colors")
local palette = colors.dracula

return {
	hotkey = { mods = { "cmd" }, key = "space" },
	scanDirs = {
		"/Applications",
		"/System/Applications",
		os.getenv("HOME") .. "/Applications",
	},
	dbPath = hs.configdir .. "/data/launcher.db",
	chooser = { width = 36, rows = 10, fgColor = palette.foreground, subTextColor = palette.comment },
}
