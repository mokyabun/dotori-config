local socket = require("lib.socket")
local view = require("menubar.view")

local YABAI_BIN = "/opt/homebrew/bin/yabai"

local state = {
	workspaces = {},
	workspacesByMonitorName = {},
	fullscreenByMonitorName = {},
	focused = nil,
	layout = "tiling",
	power = nil,
	cpu = nil,
	ram = nil,
	caffeinate = { display = false, system = false },
}

local activeQueries = {}

local function queryYabai(selector, onDone)
	local task
	task = hs.task.new(YABAI_BIN, function(exitCode, stdout)
		activeQueries[task] = nil
		if exitCode ~= 0 or stdout == "" then
			onDone(nil)
			return
		end
		local ok, data = pcall(hs.json.decode, stdout)
		onDone(ok and data or nil)
	end, { "-m", "query", selector })

	if not task then
		onDone(nil)
		return
	end
	activeQueries[task] = true
	task:start()
end

local function applyTopology(spaces, displays)
	spaces = spaces or {}
	displays = displays or {}

	local workspaces = {}
	local workspacesByMonitorName = {}
	local fullscreenByMonitorName = {}
	local fullscreenByDisplay = {}
	for _, space in ipairs(spaces) do
		if space["is-visible"] and space["is-native-fullscreen"] then
			fullscreenByDisplay[space.display] = true
		end
		if space["has-focus"] then
			state.focused = tostring(space.index)
		end
	end

	if #displays > 0 then
		for _, display in ipairs(displays) do
			local monitorName = display.uuid or tostring(display.index)
			fullscreenByMonitorName[monitorName] = fullscreenByDisplay[display.index] or false
			local names = {}
			for _, space in ipairs(display.spaces or {}) do
				names[#names + 1] = tostring(space)
			end

			if #names > 0 then
				workspacesByMonitorName[monitorName] = names
			end
			for _, name in ipairs(names) do
				workspaces[#workspaces + 1] = name
			end
		end
	end

	if #workspaces == 0 then
		for _, space in ipairs(spaces) do
			workspaces[#workspaces + 1] = tostring(space.index)
		end
	end

	state.workspaces = workspaces
	state.workspacesByMonitorName = workspacesByMonitorName
	state.fullscreenByMonitorName = fullscreenByMonitorName
end

local topologyRefreshInFlight = false
local topologyRefreshQueued = false
local refreshTopology

refreshTopology = function()
	if topologyRefreshInFlight then
		topologyRefreshQueued = true
		return
	end

	topologyRefreshInFlight = true
	local results = {}
	local pending = 2
	local function complete(name, data)
		results[name] = data
		pending = pending - 1
		if pending > 0 then
			return
		end

		topologyRefreshInFlight = false
		if results.spaces or results.displays then
			applyTopology(results.spaces, results.displays)
			view.refresh(state)
		end
		if topologyRefreshQueued then
			topologyRefreshQueued = false
			refreshTopology()
		end
	end

	queryYabai("--spaces", function(data)
		complete("spaces", data)
	end)
	queryYabai("--displays", function(data)
		complete("displays", data)
	end)
end

local function refreshCaffeinate()
	state.caffeinate = {
		display = hs.caffeinate.get("displayIdle"),
		system = hs.caffeinate.get("systemIdle"),
	}
end

local function refreshView()
	refreshCaffeinate()
	view.refresh(state)
end

refreshCaffeinate()

view.init(state)
refreshTopology()

-- Clock: use a new one-shot timer for every tick so delayed callbacks never
-- make the clock drift away from wall-clock minute boundaries.
local clockTimer

local function scheduleClock()
	if clockTimer then
		clockTimer:stop()
	end
	local delay = 60 - (hs.timer.secondsSinceEpoch() % 60)
	clockTimer = hs.timer.doAfter(delay, function()
		view.refreshClock()
		scheduleClock()
	end)
end

scheduleClock()

-- Display changes arrive in bursts after wake. Coalesce normal screen events,
-- then reload once after the external displays have had time to settle.
local screenRefreshTimer
local wakeReloadTimer

local function refreshScreens()
	refreshCaffeinate()
	view.init(state)
	refreshTopology()
end

local function scheduleScreenRefresh(delay)
	if screenRefreshTimer then
		screenRefreshTimer:stop()
	end
	screenRefreshTimer = hs.timer.doAfter(delay or 1, function()
		screenRefreshTimer = nil
		refreshScreens()
	end)
end

local function scheduleWakeReload()
	if wakeReloadTimer then
		wakeReloadTimer:stop()
	end
	wakeReloadTimer = hs.timer.doAfter(10, function()
		wakeReloadTimer = nil
		hs.reload()
	end)
end

-- Wake from sleep: refresh immediately, then perform one clean reload 10 seconds
-- after the latest wake event. Both wake events may fire for the same resume.
local caffeWatcher = hs.caffeinate.watcher.new(function(event)
	if event == hs.caffeinate.watcher.systemDidWake or event == hs.caffeinate.watcher.screensDidWake then
		refreshView()
		scheduleClock()
		scheduleWakeReload()
	end
end)
caffeWatcher:start()

-- System metrics: reuse the macmon power stream for CPU and RAM as well.
local powerTask
local powerRestartTimer
local powerBuffer = ""

local function usagePercent(value)
	if type(value) ~= "number" then
		return nil
	end
	local percent = value <= 1 and value * 100 or value
	return math.max(0, math.min(100, math.floor(percent + 0.5)))
end

local function applyMetrics(data)
	local changed = false
	if data.sys_power then
		local power = string.format("%.1fW", data.sys_power)
		if power ~= state.power then
			state.power = power
			changed = true
		end
	end

	local cpuPercent = usagePercent(data.cpu_usage_pct)
	if cpuPercent then
		local cpu = string.format("%d%%", cpuPercent)
		if cpu ~= state.cpu then
			state.cpu = cpu
			changed = true
		end
	end

	local memory = data.memory
	if memory and memory.ram_usage then
		local ram = string.format("%.0fG", memory.ram_usage / (1024 ^ 3))
		if ram ~= state.ram then
			state.ram = ram
			changed = true
		end
	end

	if changed then
		view.refreshMetrics(state)
	end
end

local function startPowerStream()
	if powerRestartTimer then
		powerRestartTimer:stop()
		powerRestartTimer = nil
	end
	powerBuffer = ""
	powerTask = hs.task.new("/opt/homebrew/bin/macmon", function()
		powerTask = nil
		powerRestartTimer = hs.timer.doAfter(5, startPowerStream)
	end, function(_, stdout, _)
		powerBuffer = powerBuffer .. stdout
		while true do
			local newline = powerBuffer:find("\n", 1, true)
			if not newline then
				break
			end
			local line = powerBuffer:sub(1, newline - 1)
			powerBuffer = powerBuffer:sub(newline + 1)
			local ok, data = pcall(hs.json.decode, line)
			if ok and data then
				applyMetrics(data)
			end
		end
		return true
	end, { "pipe", "-i", "1000" })
	if powerTask then
		powerTask:start()
	else
		powerRestartTimer = hs.timer.doAfter(5, startPowerStream)
	end
end

startPowerStream()

-- Screen layout changes: wait for the current burst of display events to settle.
local screenWatcher = hs.screen.watcher.new(function()
	scheduleScreenRefresh()
end)
screenWatcher:start()

-- yabai events
socket
	.on("yabai", "ws", function(_, workspace)
		state.focused = workspace
		view.refresh(state)
		refreshTopology()
	end)
	.on("yabai", "refresh", function()
		refreshTopology()
	end)
	.on("yabai", "layout", function(_, layout)
		state.layout = layout
		refreshView()
	end)
	.on("system", "caffeinate", function()
		refreshView()
	end)
