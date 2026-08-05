local colors = require("lib.colors")
local palette = colors.dracula

local Notify = {}

local FONT = "JetBrainsMono Nerd Font"
local WIDTH = 260
local HEIGHT = 50
local DEFAULT_DURATION = 0.8

local activeCanvas
local activeTimer

local function styled(str, size, color, alignment)
	return hs.styledtext.new(str or "", {
		font = { name = FONT, size = size },
		color = color,
		paragraphStyle = { alignment = alignment or "left" },
	})
end

local function close()
	if activeTimer then
		activeTimer:stop()
		activeTimer = nil
	end
	if activeCanvas then
		activeCanvas:delete()
		activeCanvas = nil
	end
end

local function screenFrame()
	local screen = hs.screen.mainScreen()
	return screen and screen:frame() or { x = 0, y = 0, w = 1440, h = 900 }
end

function Notify.show(options)
	if type(options) == "string" then
		options = { title = options }
	end
	options = options or {}

	close()

	local accent = options.color or palette.purple
	local title = options.title or ""
	local subtitle = options.subtitle or options.subText or ""
	local icon = options.icon or ""
	local duration = options.duration or DEFAULT_DURATION
	local frame = screenFrame()
	local x = frame.x + (frame.w - WIDTH) / 2
	local y = frame.y + (frame.h - HEIGHT) / 2
	local text = title
	if subtitle ~= "" then
		text = title .. " · " .. subtitle
	end
	if icon ~= "" then
		text = icon .. "  " .. text
	end

	activeCanvas = hs.canvas.new({ x = x, y = y, w = WIDTH, h = HEIGHT })
	activeCanvas:level(hs.canvas.windowLevels["mainMenu"])
	activeCanvas:alpha(0.88)
	activeCanvas:appendElements({
		{
			type = "rectangle",
			action = "fill",
			fillColor = colors.withAlpha(palette.background, 0.94),
			roundedRectRadii = { xRadius = 8, yRadius = 8 },
			frame = { x = 0, y = 0, w = WIDTH, h = HEIGHT },
		},
		{
			type = "rectangle",
			action = "stroke",
			strokeColor = colors.withAlpha(palette.currentLine, 0.96),
			strokeWidth = 1,
			roundedRectRadii = { xRadius = 8, yRadius = 8 },
			frame = { x = 0.5, y = 0.5, w = WIDTH - 1, h = HEIGHT - 1 },
		},
		{
			type = "text",
			text = styled(text, 12, accent, "center"),
			frame = { x = 12, y = 17, w = WIDTH - 24, h = 16 },
		},
	})

	activeCanvas:show()
	activeTimer = hs.timer.doAfter(duration, close)
	return activeCanvas
end

function Notify.close()
	close()
end

return Notify
