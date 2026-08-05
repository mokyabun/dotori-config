local Frecency = {}

local db

local TIME_WEIGHTS = {
	{ maxAge = 4 * 86400, weight = 2.0 },
	{ maxAge = 14 * 86400, weight = 1.5 },
	{ maxAge = 31 * 86400, weight = 1.0 },
	{ maxAge = 90 * 86400, weight = 0.5 },
}

local function getTimeWeight(lastUsed)
	local age = os.time() - (lastUsed or 0)
	for _, entry in ipairs(TIME_WEIGHTS) do
		if age <= entry.maxAge then
			return entry.weight
		end
	end
	return 0.25
end

function Frecency.init(database)
	db = database
end

function Frecency.record(bundleId)
	local now = os.time()
	local stmt = db:prepare(
		"INSERT INTO app_frecency(bundle_id, launches, last_used) VALUES(?,1,?)"
			.. " ON CONFLICT(bundle_id) DO UPDATE SET launches=launches+1, last_used=?"
	)
	stmt:bind_values(bundleId, now, now)
	stmt:step()
	stmt:finalize()
end

function Frecency.sort(appList)
	local scores = {}
	for row in db:nrows("SELECT bundle_id, launches, last_used FROM app_frecency") do
		scores[row.bundle_id] = row.launches * getTimeWeight(row.last_used)
	end

	table.sort(appList, function(appA, appB)
		local scoreA = scores[appA.bundleId] or 0
		local scoreB = scores[appB.bundleId] or 0
		if scoreA ~= scoreB then
			return scoreA > scoreB
		end
		return appA.name < appB.name
	end)
end

return Frecency
