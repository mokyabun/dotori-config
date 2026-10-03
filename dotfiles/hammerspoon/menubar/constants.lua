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
	RADIUS = 2,

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
	BG = colors.withAlpha(palette.background, 0.96),
	ACTIVE_BG = palette.currentLine,
	DIV = colors.withAlpha(palette.currentLine, 0.6),
	TEXT = palette.foreground,
	MUTED = palette.comment,
	DIM = colors.withAlpha(palette.comment, 0.72),
	GOOD = palette.green,
	WARN = palette.yellow,
}
