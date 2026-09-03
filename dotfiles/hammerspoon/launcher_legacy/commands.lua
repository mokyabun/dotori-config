local colors = require("lib.colors")
local notify = require("lib.notify")
local socket = require("lib.socket")
local palette = colors.dracula

local activeTasks = {}

local function getCaffeinate(key)
	return hs.caffeinate.get(key)
end

local function setCaffeinate(enabled)
	hs.caffeinate.set("displayIdle", enabled)
	hs.caffeinate.set("systemIdle", enabled)
end

local function publishCaffeinate()
	socket.send("system", "caffeinate")
end

local function notifyCaffeinate(mode)
	if mode == "full" then
		notify.show({
			icon = "CA",
			title = "Caffeinate On",
			subtitle = "Display and system stay awake",
			color = palette.green,
		})
	elseif mode == "system" then
		notify.show({
			icon = "SY",
			title = "System Caffeinate On",
			subtitle = "System stays awake, display may sleep",
			color = palette.yellow,
		})
	else
		notify.show({
			icon = "ZZ",
			title = "Caffeinate Off",
			subtitle = "Normal sleep policy restored",
			color = palette.comment,
		})
	end
end

local function restartLaunchAgent(label, name, icon, logName)
	local output = hs.execute("/usr/bin/id -u") or ""
	local uid = output:match("%d+")
	if not uid then
		notify.show({
			icon = icon,
			title = name .. " Reload Failed",
			subtitle = "Could not resolve the user ID",
			color = palette.red,
		})
		return
	end

	local task
	task = hs.task.new("/bin/launchctl", function(exitCode)
		activeTasks[task] = nil
		local succeeded = exitCode == 0
		notify.show({
			icon = icon,
			title = name .. (succeeded and " Reloaded" or " Reload Failed"),
			subtitle = succeeded and "Config reloaded" or ("Check " .. logName),
			color = succeeded and palette.purple or palette.red,
		})
	end, { "kickstart", "-k", "gui/" .. uid .. "/" .. label })
	if task then
		activeTasks[task] = true
		task:start()
	end
end

return {
	-- System
	{
		text = "Lock Screen",
		subText = "System",
		fn = function()
			hs.caffeinate.lockScreen()
		end,
	},
	{
		text = "Sleep",
		subText = "System",
		fn = function()
			hs.caffeinate.systemSleep()
		end,
	},
	{
		text = "Restart",
		subText = "System",
		fn = function()
			hs.caffeinate.restartSystem()
		end,
	},
	{
		text = "Shut Down",
		subText = "System",
		fn = function()
			hs.caffeinate.shutdownSystem()
		end,
	},
	{
		text = "Log Out",
		subText = "System",
		fn = function()
			hs.caffeinate.logOut()
		end,
	},
	{
		text = "Reload Hammerspoon",
		subText = "System",
		fn = function()
			hs.reload()
		end,
	},
	{
		text = "Reload yabai",
		subText = "System",
		fn = function()
			restartLaunchAgent("yabai", "yabai", "YB", "yabai.err.log")
		end,
	},
	{
		text = "Reload skhd",
		subText = "System",
		fn = function()
			restartLaunchAgent("skhd", "skhd", "SK", "skhd.err.log")
		end,
	},
	{
		text = "Sleep Display",
		subText = "Sleep display only, system stays awake",
		fn = function()
			hs.execute("pmset displaysleepnow")
		end,
	},

	-- Caffeinate
	{
		text = "Toggle Caffeinate",
		subText = function()
			return getCaffeinate("displayIdle") and "Caffeinate: On" or "Caffeinate: Off"
		end,
		fn = function()
			local enabled = not getCaffeinate("displayIdle")
			setCaffeinate(enabled)
			publishCaffeinate()
			notifyCaffeinate(enabled and "full" or "off")
		end,
	},
	{
		text = "Toggle Caffeinate (System Only)",
		subText = function()
			if hs.caffeinate.get("displayIdle") then
				return "Caffeinate: On"
			end
			return hs.caffeinate.get("systemIdle") and "Caffeinate: On (system only)" or "Caffeinate: Off"
		end,
		fn = function()
			local enabled = hs.caffeinate.get("displayIdle") or not hs.caffeinate.get("systemIdle")
			hs.caffeinate.set("displayIdle", false)
			hs.caffeinate.set("systemIdle", enabled, true)
			publishCaffeinate()
			notifyCaffeinate(enabled and "system" or "off")
		end,
	},

	-- RAM Disk
	{
		text = "Make RAM Disk",
		subText = "Create 16 GB RAM disk at /Volumes/RAMDisk",
		fn = function()
			hs.task
				.new(
					"/bin/sh",
					function()
						notify.show({
							icon = "RD",
							title = "RAM Disk Ready",
							subtitle = "/Volumes/RAMDisk",
							color = palette.cyan,
						})
					end,
					{ "-c", 'diskutil erasevolume HFS+ "RAMDisk" $(hdiutil attach -nomount ram://33554432)' }
				)
				:start()
		end,
	},
	{
		text = "Eject RAM Disk",
		subText = "Eject /Volumes/RAMDisk",
		fn = function()
			hs.task.new("/bin/sh", function()
				notify.show({
					icon = "RD",
					title = "RAM Disk Ejected",
					subtitle = "/Volumes/RAMDisk",
					color = palette.orange,
				})
			end, { "-c", "diskutil eject RAMDisk" }):start()
		end,
	},
}
