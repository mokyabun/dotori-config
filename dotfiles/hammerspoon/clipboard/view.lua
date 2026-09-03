local View = {}

local webview, controller, watcher, reloadTimer
local eventHandler
local ready = false
local requested = false
local allowBlurClose = false
local pendingOpen
local source = debug.getinfo(1, "S").source:sub(2)
local root = source:match("^(.*)/[^/]+$")
local webRoot = root .. "/web"
local documentPath = webRoot .. "/index.html"
local stylePath = webRoot .. "/style.css"
local scriptPath = webRoot .. "/main.js"

local function readFile(path)
	local file, err = io.open(path, "r")
	if not file then error(err) end
	local content = file:read("*a")
	file:close()
	return content
end

local function replaceOnce(document, marker, content)
	local updated, count = document:gsub(marker, function() return content end, 1)
	if count ~= 1 then error("clipboard document is missing " .. marker) end
	return updated
end

local function document()
	local html = readFile(documentPath)
	html = replaceOnce(html, "__CLIPBOARD_STYLE__", "<style>\n" .. readFile(stylePath) .. "\n</style>")
	html = replaceOnce(html, "__CLIPBOARD_SCRIPT__", "<script>\n" .. readFile(scriptPath) .. "\n</script>")
	return html
end

local function emit(event)
	if not ready or not webview then return false end
	local encoded = hs.json.encode(event)
	webview:evaluateJavaScript("window.plater.receive(" .. encoded .. ")", function(_, err)
		if err and err.code ~= 0 then hs.printf("clipboard web UI: %s", hs.inspect(err)) end
	end)
	return true
end

local function hide()
	requested = false
	pendingOpen = nil
	allowBlurClose = false
	if webview then
		emit({ type = "clipboard.closed", payload = {} })
		webview:hide()
	end
end

local function handleMessage(message)
	local event = message.body
	if type(event) ~= "table" or type(event.type) ~= "string" then return end
	if event.type == "ui.ready" then
		ready = true
		if pendingOpen then emit(pendingOpen) end
		return
	end
	if event.type == "clipboard.rendered" and requested then
		webview:show():bringToFront(true)
		hs.timer.doAfter(0.02, function()
			if requested then emit({ type = "clipboard.focus", payload = {} }) end
		end)
		hs.timer.doAfter(0.18, function()
			if requested then allowBlurClose = true end
		end)
	end
	if eventHandler then eventHandler(event) end
end

local function create()
	if webview then return end
	controller = hs.webview.usercontent.new("plater")
	controller:setCallback(handleMessage)
	webview = hs.webview.new({ x = 0, y = 0, w = 1, h = 1 },
		{ developerExtrasEnabled = true, javaScriptCanOpenWindowsAutomatically = false }, controller)
		:windowStyle({ "borderless", "nonactivating" })
		:allowTextEntry(true)
		:allowNewWindows(false)
		:transparent(true)
		:shadow(false)
		:level(hs.drawing.windowLevels.mainMenu)
		:behaviorAsLabels({ "canJoinAllSpaces", "fullScreenAuxiliary", "transient", "ignoresCycle" })
		:windowTitle("Dotori Clipboard")
	webview:policyCallback(function(action, _, details)
		if action ~= "navigationAction" then return true end
		local url = details.request.URL
		if type(url) == "table" then url = url.url end
		return url == "about:blank"
	end)
	webview:windowCallback(function(action, _, state)
		if action == "focusChange" and state == false and requested and allowBlurClose then hide() end
	end)
	webview:html(document())
end

function View.init(handler)
	eventHandler = handler
	create()
	if not watcher then
		watcher = hs.pathwatcher.new(webRoot, function(paths)
			for _, path in ipairs(paths) do
				if path:match("index%.html$") or path:match("style%.css$") or path:match("main%.js$") then
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

function View.open(frame, event)
	create()
	requested = true
	allowBlurClose = false
	pendingOpen = event
	webview:frame(frame)
	if ready then emit(event) end
end

function View.hide()
	hide()
end

function View.reload()
	local ok, html = pcall(document)
	if not ok then
		hs.printf("clipboard reload failed; keeping current UI: %s", html)
		return false
	end
	ready = false
	allowBlurClose = false
	if webview:isVisible() then webview:hide() end
	webview:html(html)
	return true
end

function View.status()
	return { ready = ready, requested = requested, visible = webview and webview:isVisible() or false }
end

function View.destroy()
	if watcher then watcher:stop(); watcher = nil end
	if reloadTimer then reloadTimer:stop(); reloadTimer = nil end
	if controller then controller:setCallback(nil); controller = nil end
	if webview then webview:hide():delete(); webview = nil end
	ready = false
	requested = false
	pendingOpen = nil
end

return View
