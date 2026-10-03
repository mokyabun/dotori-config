local config = require("clipboard.constants")

local Search = {}

local db
local chooser
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
			text = row.preview,
			subText = formatTimeAgo(row.created_at) .. " • " .. row.len .. " chars",
			uuid = uuid,
		}
	end

	return choices
end

local function onChoice(item)
	if not item then
		return
	end
	local rowId = rowIdByUuid[item.uuid]
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

function Search.init(database)
	db = database

	chooser = hs.chooser.new(onChoice)
	chooser:placeholderText("Search clipboard…")
	chooser:searchSubText(false)
	chooser:width(config.chooser.width)
	chooser:rows(config.chooser.rows)
	chooser:bgDark(true)
	chooser:fgColor(config.chooser.fgColor)
	chooser:subTextColor(config.chooser.subTextColor)
end

function Search.show()
	chooser:choices(buildChoices())
	chooser:show()
end

return Search
