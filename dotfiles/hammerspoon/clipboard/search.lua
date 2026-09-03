local config = require("clipboard.constants")
local view = require("clipboard.view")

local Search = {}

local db
local rowIdByUuid = {}

local function formatTimeAgo(timestamp)
	local elapsed = os.time() - timestamp
	if elapsed < 60 then
		return "just now"
	elseif elapsed < 3600 then
		return math.floor(elapsed / 60) .. "m ago"
	elseif elapsed < 86400 then
		return math.floor(elapsed / 3600) .. "h ago"
	else
		return math.floor(elapsed / 86400) .. "d ago"
	end
end

local function buildChoices()
	rowIdByUuid = {}
	local choices = {}

	for row in
		db:nrows("SELECT id, preview, created_at, length(content) AS len" .. " FROM clipboard ORDER BY created_at DESC")
	do
		local uuid = tostring(row.id)
		rowIdByUuid[uuid] = row.id
		choices[#choices + 1] = {
			id = uuid,
			title = row.preview,
			subtitle = formatTimeAgo(row.created_at) .. " • " .. row.len .. " chars",
		}
	end

	return choices
end

local function pasteChoice(id)
	local rowId = rowIdByUuid[id]
	if not rowId then
		return
	end

	for row in db:nrows("SELECT content FROM clipboard WHERE id=" .. rowId) do
		hs.pasteboard.setContents(row.content)
		hs.timer.doAfter(0.05, function()
			hs.eventtap.keyStroke({ "cmd" }, "v")
		end)
		break
	end
end

local function activeScreen()
	local focused = hs.window.focusedWindow()
	return (focused and focused:screen()) or hs.mouse.getCurrentScreen() or hs.screen.mainScreen()
end

local function windowFrame()
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

local function handleEvent(event)
	if event.type == "clipboard.close" then
		view.hide()
	elseif event.type == "clipboard.select" then
		local id = event.payload and event.payload.id
		view.hide()
		pasteChoice(id)
	end
end

function Search.init(database)
	db = database
	view.init(handleEvent)
end

function Search.show()
	view.open(windowFrame(), { type = "clipboard.open", payload = { choices = buildChoices() } })
end

function Search.hide()
	view.hide()
end

function Search.status()
	return view.status()
end

return Search
