local colors = require("lib.colors")
local palette = colors.dracula

return {
	hotkey = { mods = { "option" }, key = "space" },
	dbPath = hs.configdir .. "/data/clipboard.db",
	maxItems = 500,
	pollInterval = 1,
	chooser = { width = 50, rows = 10, fgColor = palette.foreground, subTextColor = palette.comment },
}
