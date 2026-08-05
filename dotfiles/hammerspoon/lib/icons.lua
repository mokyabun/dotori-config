local Icons = {}

local iconCache = {} -- bundleID → hs.image
local bundleIDCache = {} -- appName  → bundleID | false
local prefetchGeneration = 0
local prefetchTimer

local PREFETCH_BATCH_SIZE = 8
local PREFETCH_DELAY = 0.01

function Icons.get(bundleID)
	if not bundleID then
		return nil
	end
	return iconCache[bundleID] or nil
end

function Icons.load(bundleID)
	if not bundleID then
		return nil
	end
	if iconCache[bundleID] == nil then
		-- Do not negatively cache failures: applications may still be registering
		-- with Launch Services while Hammerspoon starts.
		iconCache[bundleID] = hs.image.imageFromAppBundle(bundleID)
	end
	return iconCache[bundleID]
end

function Icons.cancelPrefetch()
	prefetchGeneration = prefetchGeneration + 1
	if prefetchTimer then
		prefetchTimer:stop()
		prefetchTimer = nil
	end
end

function Icons.prefetch(list, onDone)
	Icons.cancelPrefetch()
	local generation = prefetchGeneration
	local index = 0
	local function step()
		prefetchTimer = nil
		if generation ~= prefetchGeneration then
			return
		end

		local lastIndex = math.min(index + PREFETCH_BATCH_SIZE, #list)
		while index < lastIndex do
			index = index + 1
			local bundleID = list[index].bundleID or list[index].bundleId
			list[index].icon = Icons.load(bundleID)
		end

		if index >= #list then
			if onDone then
				onDone()
			end
			return
		end

		-- Keep a strong reference until the one-shot timer fires. Hammerspoon may
		-- otherwise collect zero-delay timers before their callback runs.
		prefetchTimer = hs.timer.doAfter(PREFETCH_DELAY, step)
	end

	-- Fill the first batch immediately, then yield between subsequent batches.
	step()
end

function Icons.bundleID(appName)
	if not appName then
		return nil
	end
	if bundleIDCache[appName] == nil then
		local app = hs.application.get(appName)
		bundleIDCache[appName] = (app and app:bundleID()) or false
	end
	return bundleIDCache[appName] or nil
end

return Icons
