# Dotori Launcher

The active launcher is a prewarmed Hammerspoon `hs.webview` running a small
vanilla JavaScript UI. `Cmd-Space` toggles it. The previous `hs.chooser`
implementation is preserved in `../launcher_legacy`.

## UI development

Edit `web/index.html`, `web/style.css`, or `web/main.js` directly. Hammerspoon
watches those files and reloads the WebView automatically. At load time it
inlines the CSS and JavaScript into the HTML document, so there is no package
manager, bundler, build step, or external JavaScript runtime dependency.

To roll back, change `require("launcher")` in `common.lua` to
`require("launcher_legacy")`, then reload Hammerspoon.

## Bridge events

Lua sends `launcher.catalog`, `launcher.icons`, `launcher.open`,
`launcher.focus`, and `launcher.closed`. The web UI sends `ui.ready`,
`launcher.rendered`, `launcher.select`, and `launcher.close` through the
`plater` user-content controller.
