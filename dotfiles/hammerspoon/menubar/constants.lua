local colors = require("lib.colors")
local palette = colors.dracula

return {
	-- Layout
	BAR_W = 48,
	MARGIN_X = 0,
	MARGIN_Y = 15,
	PAD = 8,
	ITEM_H = 28,
	ITEM_GAP = 2,
	SECTION_GAP = 6,
	DIV_H = 1,
	RADIUS = 12,
	ACTIVE_RADIUS = 6,

	-- Typography
	FONT = "JetBrainsMono Nerd Font",
	WS_SIZE = 12,
	ICON_SIZE = 12,
	TIME_SIZE = 13,
	DATE_SIZE = 11,
	DAY_SIZE = 10,
	POWER_SIZE = 10,
	CAFFEINE_SIZE = 10,
	METRIC_SIZE = 10,

	-- Colors
	BG = palette.background,
	ACTIVE_BG = palette.currentLine,
	DIV = palette.currentLine,
	TEXT = palette.foreground,
	MUTED = palette.comment,
	DIM = palette.comment,
	ACCENT = palette.purple,
	GOOD = palette.green,
	WARN = palette.yellow,
}
