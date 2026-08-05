-- Dracula official palette. All values are normalized 0–1 floats.
-- https://spec.draculatheme.com

local function rgb(r, g, b)
	return { red = r / 255, green = g / 255, blue = b / 255, alpha = 1 }
end

local M = {}

M.dracula = {
	background = rgb(40, 42, 54),
	currentLine = rgb(68, 71, 90),
	foreground = rgb(248, 248, 242),
	comment = rgb(98, 114, 164),
	cyan = rgb(139, 233, 253),
	green = rgb(80, 250, 123),
	orange = rgb(255, 184, 108),
	pink = rgb(255, 121, 198),
	purple = rgb(189, 147, 249),
	red = rgb(255, 85, 85),
	yellow = rgb(241, 250, 140),
}

function M.withAlpha(color, alpha)
	return { red = color.red, green = color.green, blue = color.blue, alpha = alpha }
end

return M
