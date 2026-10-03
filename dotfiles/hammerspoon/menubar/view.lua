local C = require("menubar.constants")

local View = {}

-- entries[screenUUID] = { canvas = hs.canvas, h = number, screen = hs.screen }
local entries = {}

local DAYS = { "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT" }

local function styled(str, size, color)
	return hs.styledtext.new(str, {
		font = { name = C.FONT, size = size },
		color = color,
		paragraphStyle = { alignment = "center" },
	})
end

local function screenWorkspaces(state, screen)
	local name = screen:getUUID()
	return (name and state.workspacesByMonitorName and state.workspacesByMonitorName[name]) or state.workspaces
end

local function screenIsFullscreen(state, screen)
	local name = screen:getUUID()
	return name and state.fullscreenByMonitorName and state.fullscreenByMonitorName[name] or false
end

local function updateVisibility(entry, state)
	if screenIsFullscreen(state, entry.screen) then
		entry.canvas:hide()
	else
		entry.canvas:show()
	end
end

local function drawOn(canvas, h, state, screen)
	canvas:replaceElements()

	local w = C.BAR_W

	-- Background (full height)
	canvas:appendElements({
		type = "rectangle",
		action = "fill",
		fillColor = C.BG,
		frame = { x = 0, y = 0, w = w, h = h },
	})

	local function divLine(dy)
		canvas:appendElements({
			type = "rectangle",
			action = "fill",
			fillColor = C.DIV,
			frame = { x = 6, y = dy, w = w - 12, h = C.DIV_H },
		})
	end

	local function textItem(str, size, color, iy, id)
		canvas:appendElements({
			id = id,
			type = "text",
			text = styled(str, size, color),
			frame = {
				x = 0,
				y = iy + math.floor((C.ITEM_H - size) / 2),
				w = w,
				h = size + 2,
			},
		})
	end

	-- TOP: day / date / time
	local t = os.time()
	local day = DAYS[tonumber(os.date("%w", t)) + 1]

	textItem(day, C.DAY_SIZE, C.DIM, C.PAD + C.MARGIN_Y, "day")
	textItem(os.date("%m.%d", t), C.DATE_SIZE, C.MUTED, C.PAD + C.MARGIN_Y + C.ITEM_H, "date")
	textItem(os.date("%H:%M", t), C.TIME_SIZE, C.TEXT, C.PAD + C.MARGIN_Y + 2 * C.ITEM_H, "clock")

	local topDiv = C.PAD + C.MARGIN_Y + 3 * C.ITEM_H + C.SECTION_GAP
	divLine(topDiv)

	-- BOTTOM: caffeinate status, then compact system metrics
	local caffeine = state.caffeinate or {}
	local caffeineText = "IDLE"
	local caffeineColor = C.DIM
	if caffeine.display then
		caffeineText = "CAF"
		caffeineColor = C.GOOD
	elseif caffeine.system then
		caffeineText = "SYS"
		caffeineColor = C.WARN
	end

	local caffeineBlockH = C.ITEM_H
	local metricsBlockH = 3 * C.ITEM_H + 2 * C.ITEM_GAP
	local bottomBlockH = caffeineBlockH + metricsBlockH + 2 * C.SECTION_GAP + C.DIV_H
	local botDiv = h - C.PAD - bottomBlockH - C.SECTION_GAP - C.DIV_H
	divLine(botDiv)
	local bottomY = botDiv + C.DIV_H + C.SECTION_GAP
	textItem(caffeineText, C.CAFFEINE_SIZE, caffeineColor, bottomY)

	local metricsDiv = bottomY + caffeineBlockH + C.SECTION_GAP
	divLine(metricsDiv)
	local metricsY = metricsDiv + C.DIV_H + C.SECTION_GAP
	textItem(state.power or "—", C.POWER_SIZE, C.DIM, metricsY, "power")
	textItem(state.cpu or "—", C.METRIC_SIZE, C.MUTED, metricsY + C.ITEM_H + C.ITEM_GAP, "cpu")
	textItem(state.ram or "—", C.METRIC_SIZE, C.MUTED, metricsY + 2 * (C.ITEM_H + C.ITEM_GAP), "ram")

	-- MIDDLE: workspaces, vertically centered in the remaining space
	local midStart = topDiv + C.DIV_H + C.SECTION_GAP
	local midEnd = botDiv - C.SECTION_GAP
	local workspaces = screenWorkspaces(state, screen)
	local wsCount = #workspaces
	local wsBlockH = wsCount * C.ITEM_H + math.max(0, wsCount - 1) * C.ITEM_GAP
	local wsY = midStart + math.floor((midEnd - midStart - wsBlockH) / 2)

	for i, ws in ipairs(workspaces) do
		local active = ws == state.focused
		if active then
			canvas:appendElements({
				type = "rectangle",
				action = "fill",
				fillColor = C.ACTIVE_BG,
				frame = { x = 4, y = wsY, w = w - 8, h = C.ITEM_H },
			})
		end
		textItem(ws, C.WS_SIZE, active and C.TEXT or C.MUTED, wsY)
		wsY = wsY + C.ITEM_H + (i < wsCount and C.ITEM_GAP or 0)
	end
end

function View.init(state)
	-- A canvas that joins every Space can leave a stale copy behind when macOS
	-- moves screens between Spaces while displays reconnect after wake. Reusing
	-- and moving that canvas then makes the old and new copies overlap. Hide all
	-- bars before deleting them, and rebuild from the settled screen topology.
	for _, entry in pairs(entries) do
		entry.canvas:hide()
		entry.canvas:delete()
	end
	entries = {}

	for _, screen in ipairs(hs.screen.allScreens()) do
		local key = screen:getUUID() or tostring(screen:id())
		local sf = screen:fullFrame()
		local frame = {
			x = sf.x + sf.w - C.MARGIN_X - C.BAR_W,
			y = sf.y,
			w = C.BAR_W,
			h = sf.h,
		}
		local canvas = hs.canvas.new(frame)
		canvas:level(hs.canvas.windowLevels["mainMenu"])
		canvas:behavior({ "canJoinAllSpaces", "stationary" })
		local entry = { canvas = canvas, h = sf.h, screen = screen }
		entries[key] = entry

		drawOn(entry.canvas, entry.h, state, entry.screen)
		updateVisibility(entry, state)
	end
end

function View.refresh(state)
	for _, e in pairs(entries) do
		drawOn(e.canvas, e.h, state, e.screen)
		updateVisibility(e, state)
	end
end

function View.refreshClock()
	local t = os.time()
	local day = DAYS[tonumber(os.date("%w", t)) + 1]
	for _, entry in pairs(entries) do
		entry.canvas["day"].text = styled(day, C.DAY_SIZE, C.DIM)
		entry.canvas["date"].text = styled(os.date("%m.%d", t), C.DATE_SIZE, C.MUTED)
		entry.canvas["clock"].text = styled(os.date("%H:%M", t), C.TIME_SIZE, C.TEXT)
	end
end

function View.refreshMetrics(state)
	for _, entry in pairs(entries) do
		entry.canvas["power"].text = styled(state.power or "—", C.POWER_SIZE, C.DIM)
		entry.canvas["cpu"].text = styled(state.cpu or "—", C.METRIC_SIZE, C.MUTED)
		entry.canvas["ram"].text = styled(state.ram or "—", C.METRIC_SIZE, C.MUTED)
	end
end

function View.destroy()
	for _, e in pairs(entries) do
		e.canvas:hide()
		e.canvas:delete()
	end
	entries = {}
end

return View
