local FRemap = require("remap.foundation_remapping")

local remapper = FRemap.new()

remapper:remap("rcmd", "f19")
remapper:remap("capslock", "f18")
remapper:register()

local f18Keycode = hs.keycodes.map["f18"]
local mehActive = false

local function mehKeyHandler(event)
	local keyCode = event:getKeyCode()

	if keyCode == f18Keycode then
		mehActive = (event:getType() == hs.eventtap.event.types.keyDown)
		return true
	end

	if mehActive then
		local flags = event:getFlags()
		flags.ctrl = true
		flags.cmd = true
		flags.alt = true
		event:setFlags(flags)
	end

	return false
end

local keyHandler = hs.eventtap
	.new({ hs.eventtap.event.types.keyDown, hs.eventtap.event.types.keyUp }, mehKeyHandler)
	:start()

return { keyHandler = keyHandler }
