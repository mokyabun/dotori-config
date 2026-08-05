local config = require("clipboard.constants")
local db = require("clipboard.db")
local watcher = require("clipboard.watcher")
local search = require("clipboard.search")

local database = db.open()

watcher.start(database)
search.init(database)

hs.hotkey.bind(config.hotkey.mods, config.hotkey.key, function()
	search.show()
end)
