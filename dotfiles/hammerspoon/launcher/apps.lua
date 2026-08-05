local config = require("launcher.constants")
local blacklist = require("launcher.blacklist")
local icons = require("lib.icons")

local Apps = {}

Apps.cache = {}

local dirWatchers = {}
local debounceTimer

local function toSet(values)
	local set = {}
	for _, value in ipairs(values or {}) do
		set[value] = true
	end
	return set
end

local blacklistedBundleIds = toSet(blacklist.bundleIds)
local blacklistedNames = toSet(blacklist.names)

local function isBlacklisted(appName, bundleId)
	return blacklistedNames[appName] or blacklistedBundleIds[bundleId]
end

local function addApp(result, seen, appPath)
	local appName = appPath:match("([^/]+)%.app$")
	local info = appName and hs.application.infoForBundlePath(appPath)
	local bundleId = info and info["CFBundleIdentifier"]
	if bundleId and not seen[bundleId] and not isBlacklisted(appName, bundleId) then
		seen[bundleId] = true
		result[#result + 1] = { name = appName, path = appPath, bundleId = bundleId }
	end
end

local function scanDirectory(result, seen, directory, depth)
	local ok, iterator, directoryObject = pcall(hs.fs.dir, directory)
	if not ok or not iterator then
		return
	end
	for name in iterator, directoryObject do
		if name ~= "." and name ~= ".." then
			local path = directory .. "/" .. name
			if hs.fs.attributes(path, "mode") == "directory" then
				if name:sub(-4) == ".app" then
					addApp(result, seen, path)
				elseif depth < 2 then
					scanDirectory(result, seen, path, depth + 1)
				end
			end
		end
	end
end

local function scan()
	local result = {}
	local seen = {}

	for _, dir in ipairs(config.scanDirs) do
		scanDirectory(result, seen, dir, 1)
	end

	addApp(result, seen, "/System/Library/CoreServices/Finder.app")

	return result
end

local function rebuild(onDone)
	local fresh = scan()
	local missing = {}

	for _, app in ipairs(fresh) do
		app.icon = icons.get(app.bundleId)
		if not app.icon then
			missing[#missing + 1] = app
		end
	end

	Apps.cache = fresh

	if #missing > 0 then
		icons.prefetch(missing, onDone)
	elseif onDone then
		onDone()
	end
end

function Apps.ensureIcons()
	icons.cancelPrefetch()
	for _, app in ipairs(Apps.cache) do
		if not app.icon then
			app.icon = icons.load(app.bundleId)
		end
	end
end

function Apps.start(onReady)
	rebuild(onReady)

	for _, dir in ipairs(config.scanDirs) do
		if hs.fs.attributes(dir, "mode") == "directory" then
			local watcher = hs.pathwatcher.new(dir, function()
				if debounceTimer then
					debounceTimer:stop()
				end
				debounceTimer = hs.timer.doAfter(1, function()
					debounceTimer = nil
					rebuild(onReady)
				end)
			end)
			watcher:start()
			dirWatchers[#dirWatchers + 1] = watcher
		end
	end
end

function Apps.stop()
	for _, watcher in ipairs(dirWatchers) do
		watcher:stop()
	end
	dirWatchers = {}
	if debounceTimer then
		debounceTimer:stop()
		debounceTimer = nil
	end
end

return Apps
