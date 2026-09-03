local icons = require("lib.icons")
local view = require("alttab.view")

local YABAI_BIN = "/opt/homebrew/bin/yabai"
local PANEL_WIDTH = 420
local ITEM_HEIGHT = 54
local PANEL_PADDING = 24

local windowList = {}
local selectedIndex = 1
local isActive = false
local focusTask
local iconDataCache = {}

local function iconData(bundleId)
	if not bundleId then return nil end
	if iconDataCache[bundleId] then return iconDataCache[bundleId] end
	local icon = icons.load(bundleId)
	if not icon then return nil end
	local ok, encoded = pcall(function() return icon:encodeAsURLString() end)
	if ok and encoded then iconDataCache[bundleId] = encoded end
	return ok and encoded or nil
end

local function queryWindows(includeAllWorkspaces)
	local flag = includeAllWorkspaces and "" or " --space"
	local output = hs.execute(YABAI_BIN .. " -m query --windows" .. flag)
	local windows = {}
	local ok, rows = pcall(hs.json.decode, output)
	if not ok or type(rows) ~= "table" then return windows end

	for _, row in ipairs(rows) do
		local appName = row.app
		if appName then
			local bundleId = icons.bundleID(appName)
			windows[#windows + 1] = {
				windowId = tostring(row.id),
				app = appName,
				title = row.title or "",
				icon = iconData(bundleId),
			}
		end
	end
	return windows
end

local function activeScreen()
	local focused = hs.window.focusedWindow()
	return (focused and focused:screen()) or hs.mouse.getCurrentScreen() or hs.screen.mainScreen()
end

local function switcherFrame(itemCount)
	local screen = activeScreen():frame()
	local width = math.min(PANEL_WIDTH, screen.w - 40)
	local height = math.min(itemCount * ITEM_HEIGHT + PANEL_PADDING, screen.h - 80)
	return {
		x = screen.x + math.floor((screen.w - width) / 2),
		y = screen.y + math.floor((screen.h - height) / 2),
		w = width,
		h = height,
	}
end

local function destroySwitcher()
	view.hide()
	isActive = false
	windowList = {}
	selectedIndex = 1
end

local function showSwitcher(includeAllWorkspaces)
	windowList = queryWindows(includeAllWorkspaces)
	if #windowList == 0 then return end

	local focusedWindow = hs.window.focusedWindow()
	local focusedId = focusedWindow and tostring(focusedWindow:id())
	local focusedIndex = 1
	if focusedId then
		for index, window in ipairs(windowList) do
			if window.windowId == focusedId then
				focusedIndex = index
				break
			end
		end
	end

	selectedIndex = (focusedIndex % #windowList) + 1
	isActive = true
	view.open(switcherFrame(#windowList), {
		type = "alttab.open",
		payload = { windows = windowList, selected = selectedIndex - 1 },
	})
end

local function selectNext()
	if #windowList == 0 then return end
	selectedIndex = (selectedIndex % #windowList) + 1
	view.select(selectedIndex - 1)
end

local function selectPrevious()
	if #windowList == 0 then return end
	selectedIndex = ((selectedIndex - 2) % #windowList) + 1
	view.select(selectedIndex - 1)
end

local function confirmSelection()
	local selected = windowList[selectedIndex]
	destroySwitcher()
	if not selected then return end

	local task
	task = hs.task.new(YABAI_BIN, function()
		if focusTask == task then focusTask = nil end
	end, { "-m", "window", "--focus", selected.windowId })
	if task then
		focusTask = task
		task:start()
	end
end

local ESCAPE_KEYCODE = 53

local tapKeyDown = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, function(event)
	local flags = event:getFlags()
	local characters = event:getCharacters()
	local keyCode = event:getKeyCode()

	if isActive then
		if keyCode == ESCAPE_KEYCODE then
			destroySwitcher()
		elseif characters == "\t" and flags:containExactly({ "cmd" }) then
			selectNext()
		elseif characters == "\t" and flags:containExactly({ "cmd", "shift" }) then
			selectPrevious()
		end
		return true
	end

	if characters == "\t" and flags:containExactly({ "cmd" }) then
		showSwitcher(false)
		return true
	elseif characters == "\t" and flags:containExactly({ "cmd", "shift" }) then
		showSwitcher(true)
		return true
	end

	return false
end)

local tapFlagsChanged = hs.eventtap.new({ hs.eventtap.event.types.flagsChanged }, function(event)
	if isActive and not event:getFlags()["cmd"] then confirmSelection() end
	return false
end)

view.init()
tapKeyDown:start()
tapFlagsChanged:start()

return {
	keyDown = tapKeyDown,
	flagsChanged = tapFlagsChanged,
	status = function()
		local status = view.status()
		status.active = isActive
		status.windows = #windowList
		return status
	end,
}
