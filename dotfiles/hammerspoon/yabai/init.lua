local socket = require("lib.socket")
local colors = require("lib.colors")
local notify = require("lib.notify")
local palette = colors.dracula

local layoutNames = { bsp = "BSP", tiling = "BSP", floating = "Floating" }

local function showLayout(label, layout)
	notify.show({
		compact = true,
		label = label,
		value = layoutNames[layout] or layout,
		color = layout == "floating" and palette.cyan or palette.purple,
	})
end

socket
	.on("yabai", "ws", function(_, workspace)
		notify.show({
			compact = true,
			label = "Workspace",
			value = workspace,
			color = palette.purple,
		})
	end)
	.on("yabai", "layout", function(_, layout)
		showLayout("Layout", layout)
	end)
	.on("yabai", "window-layout", function(_, layout)
		showLayout("Window", layout)
	end)
	.start()
