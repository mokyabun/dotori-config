local colors = require("lib.colors")
local icons = require("lib.icons")
local palette = colors.dracula

local YABAI_BIN = "/opt/homebrew/bin/yabai"

local PANEL_W = 340
local ITEM_H = 54
local ICON_SIZE = 32
local PAD_X = 14
local PAD_Y = 10
local ICON_PAD = 11
local TEXT_X = PAD_X + ICON_PAD + ICON_SIZE + 10

local CANVAS_IDX_HIGHLIGHT_FILL = 2
local CANVAS_IDX_HIGHLIGHT_BORDER = 3
local CANVAS_IDX_ITEMS_START = 4
local CANVAS_ELEMENTS_PER_ITEM = 3

local windowList = {}
local selectedIndex = 1
local isActive = false
local switcherCanvas = nil
local focusTask

local function queryWindows(includeAllWorkspaces)
	local flag = includeAllWorkspaces and "" or " --space"
	local output = hs.execute(YABAI_BIN .. " -m query --windows" .. flag)
	local windows = {}
	local ok, rows = pcall(hs.json.decode, output)
	if not ok or type(rows) ~= "table" then
		return windows
	end
	for _, row in ipairs(rows) do
		local appName = row.app
		if appName then
			local bundleID = icons.bundleID(appName)
			windows[#windows + 1] = {
				windowId = tostring(row.id),
				app = appName,
				title = row.title or "",
				icon = icons.load(bundleID),
			}
		end
	end
	return windows
end

local function updateHighlight()
	if not switcherCanvas then
		return
	end
	local itemY = PAD_Y + (selectedIndex - 1) * ITEM_H
	local frame = { x = 0, y = itemY, w = PANEL_W, h = ITEM_H }
	switcherCanvas[CANVAS_IDX_HIGHLIGHT_FILL].frame = frame
end

local function buildCanvas()
	if switcherCanvas then
		switcherCanvas:delete()
		switcherCanvas = nil
	end
	if #windowList == 0 then
		return
	end

	local itemCount = #windowList
	local panelH = itemCount * ITEM_H + PAD_Y * 2
	local screen = hs.screen.mainScreen():frame()

	switcherCanvas = hs.canvas.new({
		x = screen.x + (screen.w - PANEL_W) / 2,
		y = screen.y + (screen.h - panelH) / 2,
		w = PANEL_W,
		h = panelH,
	})

	switcherCanvas:appendElements({
		type = "rectangle",
		action = "fill",
		fillColor = colors.withAlpha(palette.background, 0.97),
		frame = { x = 0, y = 0, w = PANEL_W, h = panelH },
	})

	switcherCanvas:appendElements({
		type = "rectangle",
		action = "fill",
		fillColor = palette.currentLine,
		frame = { x = 0, y = PAD_Y, w = PANEL_W, h = ITEM_H },
	})

	switcherCanvas:appendElements({
		type = "rectangle",
		action = "skip",
		frame = { x = 0, y = PAD_Y, w = PANEL_W, h = ITEM_H },
	})

	for _, win in ipairs(windowList) do
		if win.icon then
			switcherCanvas:appendElements({
				type = "image",
				image = win.icon,
				imageAlpha = 1,
				frame = { x = 0, y = 0, w = ICON_SIZE, h = ICON_SIZE },
			})
		else
			switcherCanvas:appendElements({
				type = "rectangle",
				action = "skip",
				frame = { x = 0, y = 0, w = 0, h = 0 },
			})
		end
		switcherCanvas:appendElements({
			type = "text",
			text = win.app,
			textColor = palette.foreground,
			textSize = 13,
			textAlignment = "left",
			frame = { x = 0, y = 0, w = PANEL_W - TEXT_X - PAD_X, h = 18 },
		})
		switcherCanvas:appendElements({
			type = "text",
			text = win.title,
			textColor = palette.comment,
			textSize = 11,
			textAlignment = "left",
			frame = { x = 0, y = 0, w = PANEL_W - TEXT_X - PAD_X, h = 16 },
		})
	end

	for itemIndex = 1, itemCount do
		local itemY = PAD_Y + (itemIndex - 1) * ITEM_H
		local baseElem = CANVAS_IDX_ITEMS_START + (itemIndex - 1) * CANVAS_ELEMENTS_PER_ITEM
		switcherCanvas[baseElem].frame =
			{ x = PAD_X + ICON_PAD, y = itemY + (ITEM_H - ICON_SIZE) / 2, w = ICON_SIZE, h = ICON_SIZE }
		switcherCanvas[baseElem + 1].frame = { x = TEXT_X, y = itemY + 7, w = PANEL_W - TEXT_X - PAD_X, h = 18 }
		switcherCanvas[baseElem + 2].frame = { x = TEXT_X, y = itemY + 27, w = PANEL_W - TEXT_X - PAD_X, h = 16 }
	end

	updateHighlight()
	switcherCanvas:show()
end

local function destroySwitcher()
	if switcherCanvas then
		switcherCanvas:delete()
		switcherCanvas = nil
	end
	isActive = false
	windowList = {}
	selectedIndex = 1
end

local function showSwitcher(includeAllWorkspaces)
	windowList = queryWindows(includeAllWorkspaces)
	if #windowList == 0 then
		return
	end
	isActive = true
	local focusedWin = hs.window.focusedWindow()
	local focusedId = focusedWin and tostring(focusedWin:id())
	local focusedIdx = 1
	if focusedId then
		for i, win in ipairs(windowList) do
			if win.windowId == focusedId then
				focusedIdx = i
				break
			end
		end
	end
	selectedIndex = (focusedIdx % #windowList) + 1
	buildCanvas()
end

local function selectNext()
	if #windowList == 0 then
		return
	end
	selectedIndex = (selectedIndex % #windowList) + 1
	updateHighlight()
end

local function selectPrev()
	if #windowList == 0 then
		return
	end
	selectedIndex = ((selectedIndex - 2) % #windowList) + 1
	updateHighlight()
end

local function confirmSelection()
	if isActive and #windowList > 0 then
		local task
		task = hs.task.new(YABAI_BIN, function()
			if focusTask == task then
				focusTask = nil
			end
		end, { "-m", "window", "--focus", windowList[selectedIndex].windowId })
		if task then
			focusTask = task
			task:start()
		end
	end
	destroySwitcher()
end

local ESCAPE_KEYCODE = 53

local tapKeyDown = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, function(event)
	local flags = event:getFlags()
	local chars = event:getCharacters()
	local keyCode = event:getKeyCode()

	if isActive then
		if keyCode == ESCAPE_KEYCODE then
			destroySwitcher()
		elseif chars == "\t" and flags:containExactly({ "cmd" }) then
			selectNext()
		elseif chars == "\t" and flags:containExactly({ "cmd", "shift" }) then
			selectPrev()
		end
		return true
	end

	if chars == "\t" and flags:containExactly({ "cmd" }) then
		showSwitcher(false)
		return true
	elseif chars == "\t" and flags:containExactly({ "cmd", "shift" }) then
		showSwitcher(true)
		return true
	end

	return false
end)

local tapFlagsChanged = hs.eventtap.new({ hs.eventtap.event.types.flagsChanged }, function(event)
	if isActive and not event:getFlags()["cmd"] then
		confirmSelection()
	end
	return false
end)

tapKeyDown:start()
tapFlagsChanged:start()

return {
	keyDown = tapKeyDown,
	flagsChanged = tapFlagsChanged,
}
