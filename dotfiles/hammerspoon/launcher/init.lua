local config = require("launcher.constants")
local db = require("launcher.db")
local apps = require("launcher.apps")
local frecency = require("launcher.frecency")
local commands = require("launcher.commands")
local view = require("launcher.view")

local Launcher = {}
local YABAI_BIN = "/opt/homebrew/bin/yabai"

local appWatcher, hotkey
local registry = {}
local pendingLaunches = {}
local focusTasks = {}
local iconDataCache = {}
local appsReady = false
local iconsSent = false

local function openApp(path, bundleId)
	if not hs.application.get(bundleId) then pendingLaunches[bundleId] = true end
	hs.task.new("/usr/bin/open", nil, { path }):start()
end

local function launchOrFocusApp(handler)
	local app = hs.application.get(handler.bundleId)
	if not app then
		openApp(handler.path, handler.bundleId)
		return
	end
	local window = app:mainWindow() or app:focusedWindow()
	if not window then
		local windows = app:allWindows()
		window = windows[1]
	end
	if not window then
		openApp(handler.path, handler.bundleId)
		return
	end

	local task
	task = hs.task.new(YABAI_BIN, function(exitCode)
		if focusTasks[handler.bundleId] == task then focusTasks[handler.bundleId] = nil end
		if exitCode ~= 0 then openApp(handler.path, handler.bundleId) end
	end, { "-m", "window", "--focus", tostring(window:id()) })
	if not task then
		openApp(handler.path, handler.bundleId)
		return
	end
	focusTasks[handler.bundleId] = task
	task:start()
end

local function monogram(name)
	local letters = {}
	for word in (name or ""):gmatch("[%w]+") do
		letters[#letters + 1] = word:sub(1, 1):upper()
		if #letters == 2 then break end
	end
	return #letters > 0 and table.concat(letters) or "·"
end

local function iconData(app)
	if iconDataCache[app.bundleId] then return iconDataCache[app.bundleId] end
	if not app.icon then return nil end
	local ok, encoded = pcall(function() return app.icon:encodeAsURLString() end)
	if ok and encoded then iconDataCache[app.bundleId] = encoded end
	return ok and encoded or nil
end

local function commandSubtitle(command)
	local subtitle = command.subText
	if type(subtitle) == "function" then
		local ok, value = pcall(subtitle)
		subtitle = ok and value or nil
	end
	return type(subtitle) == "string" and subtitle or "Command"
end

local function buildChoices()
	registry = {}
	local runningApps = {}
	for _, app in ipairs(hs.application.runningApplications()) do
		local bundleId = app:bundleID()
		if bundleId then runningApps[bundleId] = true end
	end
	local appList = {}
	for _, app in ipairs(apps.cache) do appList[#appList + 1] = app end
	frecency.sort(appList)
	local choices = {}
	for _, app in ipairs(appList) do
		local id = "app:" .. app.bundleId
		registry[id] = { kind = "app", path = app.path, bundleId = app.bundleId }
		choices[#choices + 1] = {
			id = id,
			title = app.name,
			subtitle = runningApps[app.bundleId] and "Running" or "Application",
			bundleId = app.bundleId,
			monogram = monogram(app.name),
		}
	end
	for index, command in ipairs(commands) do
		local id = "cmd:" .. index
		registry[id] = { kind = "command", fn = command.fn }
		choices[#choices + 1] = {
			id = id,
			title = command.text,
			subtitle = commandSubtitle(command),
			monogram = monogram(command.text),
		}
	end
	return choices
end

local function sendCatalog(withIcons)
	local choices = buildChoices()
	view.emit({ type = "launcher.catalog", payload = { choices = choices } })
	if not withIcons or iconsSent then return choices end
	local icons = {}
	for _, app in ipairs(apps.cache) do
		local encoded = iconData(app)
		if encoded then icons[app.bundleId] = encoded end
	end
	iconsSent = view.emit({ type = "launcher.icons", payload = { icons = icons } })
	return choices
end

local function activeScreen()
	local focused = hs.window.focusedWindow()
	return (focused and focused:screen()) or hs.mouse.getCurrentScreen() or hs.screen.mainScreen()
end

local function launcherFrame()
	local frame = activeScreen():frame()
	local width = math.min(config.window.width, frame.w - 40)
	local height = math.min(config.window.height, frame.h - 40)
	return {
		x = frame.x + math.floor((frame.w - width) / 2),
		y = frame.y + math.floor((frame.h - height) * 0.36),
		w = width,
		h = height,
	}
end

local function selectChoice(id)
	local handler = registry[id]
	if not handler then return end
	view.hide()
	if handler.kind == "command" then
		handler.fn()
	else
		frecency.record(handler.bundleId)
		launchOrFocusApp(handler)
	end
end

local function handleEvent(event)
	if event.type == "ui.ready" then
		iconsSent = false
		sendCatalog(appsReady)
	elseif event.type == "launcher.close" then
		view.hide()
	elseif event.type == "launcher.select" then
		selectChoice(event.payload and event.payload.id)
	end
end

function Launcher.show()
	apps.ensureIcons()
	local choices = sendCatalog(true)
	view.open(launcherFrame(), { type = "launcher.open", payload = { choices = choices } })
end

function Launcher.hide()
	view.hide()
end

function Launcher.toggle()
	if view.isVisible() then Launcher.hide() else Launcher.show() end
end

function Launcher.status()
	local status = view.status()
	status.apps = #apps.cache
	status.icons = 0
	for _ in pairs(iconDataCache) do status.icons = status.icons + 1 end
	return status
end

local database = db.open()
frecency.init(database)
view.init(handleEvent)
apps.start(function()
	appsReady = true
	iconsSent = false
	sendCatalog(true)
end)

appWatcher = hs.application.watcher.new(function(_, event, app)
	if event == hs.application.watcher.launched and app then
		local bundleId = app:bundleID()
		if bundleId then
			if pendingLaunches[bundleId] then pendingLaunches[bundleId] = nil else frecency.record(bundleId) end
		end
	end
	if view.isVisible() and (event == hs.application.watcher.launched or event == hs.application.watcher.terminated) then
		sendCatalog(false)
	end
end)
appWatcher:start()
hotkey = hs.hotkey.bind(config.hotkey.mods, config.hotkey.key, Launcher.toggle)

return Launcher
