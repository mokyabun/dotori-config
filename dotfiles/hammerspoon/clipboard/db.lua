local sqlite3 = require("hs.sqlite3")
local config = require("clipboard.constants")

local ClipboardDb = {}
local db

local SCHEMA_VERSION = 1

local SCHEMA = [[
  CREATE TABLE IF NOT EXISTS clipboard (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    content    TEXT,
    preview    TEXT,
    hash       TEXT UNIQUE,
    created_at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_clipboard_created ON clipboard(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_clipboard_hash    ON clipboard(hash);
]]

function ClipboardDb.open()
	db = sqlite3.open(config.dbPath)
	db:exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;")

	local version = 0
	for row in db:rows("PRAGMA user_version") do
		version = row[1]
	end
	if version < SCHEMA_VERSION then
		db:exec(SCHEMA)
		db:exec("PRAGMA user_version=" .. SCHEMA_VERSION)
	end

	return db
end

function ClipboardDb.get()
	return db
end
function ClipboardDb.close()
	if db then
		db:close()
	end
end

return ClipboardDb
