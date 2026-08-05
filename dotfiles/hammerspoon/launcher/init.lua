local config = require("launcher.constants")
local db = require("launcher.db")
local apps = require("launcher.apps")
local frecency = require("launcher.frecency")
local commands = require("launcher.commands")

local chooser
local appWatcher
local registry = {}
local pendingLaunches = {}

local function buildChoices()
	registry = {}

	local runningApps = {}
	for _, app in ipairs(hs.application.runningApplications()) do
		local bundleId = app:bundleID()
		if bundleId then
			runningApps[bundleId] = true
		end
	end

	local appList = {}
	for _, app in ipairs(apps.cache) do
		appList[#appList + 1] = app
	end
	frecency.sort(appList)

	local choices = {}

	for _, app in ipairs(appList) do
		local key = "app:" .. app.bundleId
		registry[key] = { kind = "app", path = app.path, bundleId = app.bundleId }
		choices[#choices + 1] = {
			text = app.name,
			subText = runningApps[app.bundleId] and "Running" or "",
			image = app.icon,
			uuid = key,
		}
	end

	for index, command in ipairs(commands) do
		local key = "cmd:" .. index
		registry[key] = { kind = "cmd", fn = command.fn }
		choices[#choices + 1] = {
			text = command.text,
			subText = type(command.subText) == "function" and command.subText() or (command.subText or ""),
			image = command.icon,
			uuid = key,
		}
	end

	return choices
end

local function onChoice(item)
	if not item then
		return
	end
	local handler = registry[item.uuid]
	if not handler then
		return
	end
	if handler.kind == "cmd" then
		handler.fn()
	else
		frecency.record(handler.bundleId)
		pendingLaunches[handler.bundleId] = true
		hs.task.new("/usr/bin/open", nil, { handler.path }):start()
	end
end

local function show()
	-- Background prefetch normally finishes during startup. This fallback keeps
	-- icons reliable when the chooser is opened immediately after a reload.
	apps.ensureIcons()
	chooser:choices(buildChoices())
	chooser:show()
end

local function toggle()
	if chooser:isVisible() then
		chooser:hide()
		return
	end
	show()
end

local database = db.open()
frecency.init(database)

chooser = hs.chooser.new(onChoice)
chooser:placeholderText("Search apps and commands…")
chooser:searchSubText(false)
chooser:width(config.chooser.width)
chooser:rows(config.chooser.rows)
chooser:bgDark(true)
chooser:fgColor(config.chooser.fgColor)
chooser:subTextColor(config.chooser.subTextColor)

apps.start(function()
	if chooser:isVisible() then
		chooser:choices(buildChoices())
	end
end)

appWatcher = hs.application.watcher.new(function(_, event, app)
	if event == hs.application.watcher.launched and app then
		local bundleId = app:bundleID()
		if bundleId then
			if pendingLaunches[bundleId] then
				pendingLaunches[bundleId] = nil
			else
				frecency.record(bundleId)
			end
		end
	end
end)
appWatcher:start()

hs.hotkey.bind(config.hotkey.mods, config.hotkey.key, toggle)
