# Dotori AltTab

The window switcher uses a prewarmed Hammerspoon `hs.webview`. Its source is
the three files in `web/`; Lua inlines them at load time and watches them for
changes. There is no package manager or build step.
