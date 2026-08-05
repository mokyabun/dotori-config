local config = require("clipboard.constants")

local Watcher = {}

local db
local timer
local lastChangeCount

local PREVIEW_MAX_LENGTH = 120

local function normalizeWhitespace(text)
	return (text:gsub("%s+", " "))
end

local function makePreview(text)
	return normalizeWhitespace(text):sub(1, PREVIEW_MAX_LENGTH)
end

local function saveEntry(content)
	local hash = hs.hash.MD5(content)
	local preview = makePreview(content)
	local now = os.time()

	local stmt = db:prepare("INSERT OR IGNORE INTO clipboard(content, preview, hash, created_at) VALUES(?,?,?,?)")
	stmt:bind_values(content, preview, hash, now)
	stmt:step()
	stmt:finalize()

	db:exec(
		"DELETE FROM clipboard WHERE id NOT IN"
			.. " (SELECT id FROM clipboard ORDER BY created_at DESC LIMIT "
			.. config.maxItems
			.. ")"
	)
end

function Watcher.start(database)
	db = database
	lastChangeCount = hs.pasteboard.changeCount()

	timer = hs.timer.new(config.pollInterval, function()
		local currentCount = hs.pasteboard.changeCount()
		if currentCount == lastChangeCount then
			return
		end
		lastChangeCount = currentCount
		local text = hs.pasteboard.getContents()
		if text and #text > 0 then
			saveEntry(text)
		end
	end)
	timer:start()
end

function Watcher.stop()
	if timer then
		timer:stop()
	end
end

return Watcher
