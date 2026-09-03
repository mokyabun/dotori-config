local C = require("menubar.constants")

local View = {}
local entries = {}
local latestState = {}
local watcher, reloadTimer
local source = debug.getinfo(1, "S").source:sub(2)
local assetDir = source:match("^(.*)/[^/]+$") .. "/web/"
local DAYS = { "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT" }

local function readAsset(name)
	local file, err = io.open(assetDir .. name, "r")
	if not file then error(err) end
	local contents = file:read("*a")
	file:close()
	return contents
end

-- Inline local assets so this PoC needs neither a server nor file:// access.
-- The source files remain independently editable and browser-previewable.
local function document()
	local html = readAsset("index.html")
	local css = readAsset("menubar.css")
	local js = readAsset("menubar.js")
	html = html:gsub('<link rel="stylesheet" href="menubar.css">', function()
		return "<style>" .. css .. "</style>"
	end)
	return (html:gsub('<script src="menubar.js"></script>', function()
		return "<script>" .. js .. "</script>"
	end))
end

local function payload(entry)
	local state = latestState
	local now = os.time()
	return {
		screen = entry.key,
		workspaces = (state.workspacesByMonitorName or {})[entry.key] or state.workspaces or {},
		focused = state.focused,
		power = state.power or "—",
		cpu = state.cpu or "—",
		ram = state.ram or "—",
		caffeinate = state.caffeinate or {},
		clock = { day = DAYS[tonumber(os.date("%w", now)) + 1], date = os.date("%m.%d", now), time = os.date("%H:%M", now) },
	}
end

local function updateVisibility(entry)
	local fullscreen = (latestState.fullscreenByMonitorName or {})[entry.key]
	local visible = entry.ready and not fullscreen
	if visible and not entry.webview:isVisible() then
		entry.webview:show()
	elseif not visible and entry.webview:isVisible() then
		entry.webview:hide()
	end
end

local function sendState(entry)
	if not entry.ready then return end
	local event = hs.json.encode({ type = "menubar.update", payload = payload(entry) })
	entry.webview:evaluateJavaScript("window.plater.receive(" .. event .. ")", function(_, err)
		if entries[entry.key] ~= entry then return end
		-- Hammerspoon 1.1.1 returns { code = 0 } even on success.
		if err and err.code ~= 0 then
			entry.error = hs.inspect(err)
			hs.printf("menubar web UI: %s", entry.error)
			return
		end
		entry.error = nil
		updateVisibility(entry)
	end)
end

local function destroyWindows()
	local previous = entries
	entries = {}
	for _, entry in pairs(previous) do
		entry.controller:setCallback(nil)
		entry.webview:hide():delete()
	end
end

function View.reload()
	local ok, html = pcall(document)
	if not ok then
		hs.printf("menubar reload failed; keeping current UI: %s", html)
		return false
	end
	for _, entry in pairs(entries) do
		entry.ready = false
		entry.error = nil
		entry.webview:html(html)
	end
	return true
end

function View.init(state)
	local html = document()
	latestState = state
	destroyWindows()
	for _, screen in ipairs(hs.screen.allScreens()) do
		-- Use the visible frame so the native macOS menubar is never covered.
		-- These margins mirror yabai's 7px outer padding.
		local sf = screen:frame()
		local key = screen:getUUID() or tostring(screen:id())
		local entry = { key = key, ready = false }
		entries[key] = entry
		entry.controller = hs.webview.usercontent.new("plater")
		entry.controller:setCallback(function(message)
			local event = message.body
			if entries[key] == entry and type(event) == "table" and event.type == "ui.ready" then
				entry.ready = true
				sendState(entry)
			end
		end)
		entry.webview = hs.webview.new({
			x = sf.x + sf.w - C.MARGIN_X - C.BAR_W,
			y = sf.y + C.MARGIN_Y,
			w = C.BAR_W,
			h = sf.h - C.MARGIN_Y * 2,
		},
			{ developerExtrasEnabled = true, javaScriptCanOpenWindowsAutomatically = false }, entry.controller)
			:windowStyle({ "borderless", "nonactivating" })
			:allowTextEntry(false)
			:allowNewWindows(false)
			:transparent(true)
			:shadow(false)
			:level(hs.drawing.windowLevels.mainMenu)
			:behaviorAsLabels({ "canJoinAllSpaces", "stationary", "ignoresCycle" })
			:windowTitle("Plater Menubar")
		-- html() uses about:blank; block navigation to any external content.
		entry.webview:policyCallback(function(action, _, details)
			if action ~= "navigationAction" then return true end
			local url = details.request.URL
			if type(url) == "table" then url = url.url end
			return url == "about:blank"
		end)
		entry.webview:html(html)
	end
	if not watcher then
		watcher = hs.pathwatcher.new(assetDir, function(paths)
			for _, path in ipairs(paths) do
				if path:match("%.html$") or path:match("%.css$") or path:match("%.js$") then
					if reloadTimer then reloadTimer:stop() end
					reloadTimer = hs.timer.doAfter(0.2, function()
						reloadTimer = nil
						View.reload()
					end)
					break
				end
			end
		end):start()
	end
end

function View.refresh(state)
	latestState = state
	for _, entry in pairs(entries) do
		updateVisibility(entry)
		sendState(entry)
	end
end

function View.refreshClock()
	for _, entry in pairs(entries) do sendState(entry) end
end

View.refreshMetrics = View.refresh

function View.status()
	local result = {}
	for key, entry in pairs(entries) do
		result[key] = { ready = entry.ready, visible = entry.webview:isVisible(), error = entry.error }
	end
	return result
end

function View.destroy()
	if watcher then watcher:stop(); watcher = nil end
	if reloadTimer then reloadTimer:stop(); reloadTimer = nil end
	destroyWindows()
end

return View
