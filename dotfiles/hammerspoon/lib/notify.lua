local colors = require("lib.colors")

local Notify = {}

local WIDTH = 280
local HEIGHT = 60
local COMPACT_WIDTH = 232
local COMPACT_HEIGHT = 54
local DEFAULT_DURATION = 0.8

local webview, controller, watcher, reloadTimer, activeTimer
local ready = false
local requested = false
local pendingEvent
local pendingDuration = DEFAULT_DURATION
local source = debug.getinfo(1, "S").source:sub(2)
local root = source:match("^(.*)/[^/]+$")
local assetRoot = root .. "/notify"

local function readFile(path)
	local file, err = io.open(path, "r")
	if not file then error(err) end
	local content = file:read("*a")
	file:close()
	return content
end

local function replaceOnce(document, marker, content)
	local updated, count = document:gsub(marker, function() return content end, 1)
	if count ~= 1 then error("notify document is missing " .. marker) end
	return updated
end

local function document()
	local html = readFile(assetRoot .. "/index.html")
	html = replaceOnce(html, "__NOTIFY_STYLE__", "<style>\n" .. readFile(assetRoot .. "/style.css") .. "\n</style>")
	html = replaceOnce(html, "__NOTIFY_SCRIPT__", "<script>\n" .. readFile(assetRoot .. "/main.js") .. "\n</script>")
	return html
end

local function colorHex(color)
	color = color or colors.dracula.purple
	local function channel(value)
		return math.max(0, math.min(255, math.floor((value or 0) * 255 + 0.5)))
	end
	return string.format("#%02x%02x%02x", channel(color.red), channel(color.green), channel(color.blue))
end

local function emit(event)
	if not ready or not webview then return false end
	local encoded = hs.json.encode(event)
	webview:evaluateJavaScript("window.plater.receive(" .. encoded .. ")", function(_, err)
		if err and err.code ~= 0 then hs.printf("notify web UI: %s", hs.inspect(err)) end
	end)
	return true
end

local function close()
	requested = false
	pendingEvent = nil
	if activeTimer then activeTimer:stop(); activeTimer = nil end
	if webview then
		emit({ type = "notify.closed", payload = {} })
		webview:hide()
	end
end

local function scheduleClose()
	if activeTimer then activeTimer:stop() end
	activeTimer = hs.timer.doAfter(pendingDuration, function()
		activeTimer = nil
		close()
	end)
end

local function handleMessage(message)
	local event = message.body
	if type(event) ~= "table" or type(event.type) ~= "string" then return end
	if event.type == "ui.ready" then
		ready = true
		if pendingEvent then emit(pendingEvent) end
	elseif event.type == "notify.rendered" and requested then
		webview:show()
		hs.timer.doAfter(0.02, function()
			if requested then emit({ type = "notify.focus", payload = {} }) end
		end)
		scheduleClose()
	end
end

local function create()
	if webview then return end
	controller = hs.webview.usercontent.new("plater")
	controller:setCallback(handleMessage)
	webview = hs.webview.new({ x = 0, y = 0, w = WIDTH, h = HEIGHT },
		{ developerExtrasEnabled = true, javaScriptCanOpenWindowsAutomatically = false }, controller)
		:windowStyle({ "borderless", "nonactivating" })
		:allowTextEntry(false)
		:allowNewWindows(false)
		:transparent(true)
		:shadow(false)
		:level(hs.drawing.windowLevels.mainMenu)
		:behaviorAsLabels({ "canJoinAllSpaces", "fullScreenAuxiliary", "transient", "ignoresCycle" })
		:windowTitle("Dotori Notification")
	webview:policyCallback(function(action, _, details)
		if action ~= "navigationAction" then return true end
		local url = details.request.URL
		if type(url) == "table" then url = url.url end
		return url == "about:blank"
	end)
	webview:html(document())

	watcher = hs.pathwatcher.new(assetRoot, function(paths)
		for _, path in ipairs(paths) do
			if path:match("index%.html$") or path:match("style%.css$") or path:match("main%.js$") then
				if reloadTimer then reloadTimer:stop() end
				reloadTimer = hs.timer.doAfter(0.2, function()
					reloadTimer = nil
					local ok, html = pcall(document)
					if not ok then
						hs.printf("notify reload failed; keeping current UI: %s", html)
						return
					end
					ready = false
					if webview:isVisible() then webview:hide() end
					webview:html(html)
				end)
				break
			end
		end
	end):start()
end

function Notify.show(options)
	if type(options) == "string" then options = { title = options } end
	options = options or {}
	create()
	if activeTimer then activeTimer:stop(); activeTimer = nil end

	local screen = hs.mouse.getCurrentScreen() or hs.screen.mainScreen()
	local frame = screen and screen:frame() or { x = 0, y = 0, w = 1440, h = 900 }
	local compact = options.compact == true
	local width = compact and COMPACT_WIDTH or WIDTH
	local height = compact and COMPACT_HEIGHT or HEIGHT
	webview:frame({
		x = frame.x + math.floor((frame.w - width) / 2),
		y = frame.y + math.floor((frame.h - height) / 2),
		w = width,
		h = height,
	})
	pendingDuration = options.duration or DEFAULT_DURATION
	pendingEvent = {
		type = "notify.show",
		payload = {
			compact = compact,
			label = options.label or "",
			value = tostring(options.value or ""),
			title = options.title or "",
			subtitle = options.subtitle or options.subText or "",
			icon = options.icon or "",
			color = colorHex(options.color),
		},
	}
	requested = true
	if ready then emit(pendingEvent) end
	return webview
end

function Notify.close()
	close()
end

function Notify.status()
	return { ready = ready, requested = requested, visible = webview and webview:isVisible() or false }
end

create()

return Notify
