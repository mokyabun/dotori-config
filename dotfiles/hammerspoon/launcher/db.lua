local sqlite3 = require("hs.sqlite3")
local config = require("launcher.constants")

local LauncherDb = {}
local db

local SCHEMA_VERSION = 1

local SCHEMA = [[
  CREATE TABLE IF NOT EXISTS app_frecency (
    bundle_id TEXT PRIMARY KEY,
    launches  INTEGER NOT NULL DEFAULT 0,
    last_used INTEGER NOT NULL DEFAULT 0
  );
]]

function LauncherDb.open()
	local dir = config.dbPath:match("^(.*)/[^/]+$")
	if dir then
		hs.execute("mkdir -p '" .. dir .. "'")
	end
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

function LauncherDb.get()
	return db
end
function LauncherDb.close()
	if db then
		db:close()
	end
end

return LauncherDb
