local socket = require("lib.socket")
local colors = require("lib.colors")
local notify = require("lib.notify")
local palette = colors.dracula

local layoutIcons = { bsp = "󰕰", tiling = "󰕰", floating = "󰖲" }
local layoutNames = { bsp = "BSP", tiling = "BSP", floating = "Floating" }

local function showLayout(layout, subtitle)
	notify.show({
		icon = layoutIcons[layout] or "◇",
		title = layoutNames[layout] or layout,
		subtitle = subtitle,
		color = layout == "floating" and palette.cyan or palette.purple,
	})
end

socket
	.on("yabai", "ws", function(_, workspace)
		notify.show({
			icon = "WS",
			title = "Workspace " .. workspace,
			subtitle = "yabai",
			color = palette.purple,
		})
	end)
	.on("yabai", "layout", function(_, layout)
		showLayout(layout, "Space layout")
	end)
	.on("yabai", "window-layout", function(_, layout)
		showLayout(layout, "Window layout")
	end)
	.start()
