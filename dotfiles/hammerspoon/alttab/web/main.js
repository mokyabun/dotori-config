(() => {
    "use strict";

    let bridgeReady = false;
    let windows = [];
    let selected = 0;
    const shell = document.querySelector(".switcher-shell");
    const list = document.querySelector("#window-list");

    function element(tagName, className, text) {
        const node = document.createElement(tagName);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function fallback(app) {
        return element("span", "fallback", String(app || "·").slice(0, 1).toLocaleUpperCase());
    }

    function icon(window) {
        const wrapper = element("span", "icon");
        if (!window.icon) {
            wrapper.append(fallback(window.app));
            return wrapper;
        }
        const image = element("img");
        image.src = window.icon;
        image.alt = "";
        image.draggable = false;
        image.addEventListener("error", () => wrapper.replaceChildren(fallback(window.app)), { once: true });
        wrapper.append(image);
        return wrapper;
    }

    function createEntry(window, index) {
        const entry = element("div", `window-entry${index === selected ? " selected" : ""}`);
        entry.id = `alttab-option-${index}`;
        entry.setAttribute("role", "option");
        entry.setAttribute("aria-selected", String(index === selected));
        const copy = element("span", "copy");
        copy.append(
            element("strong", "app", window.app || "Unknown application"),
            element("small", "title", window.title || "Untitled window"),
        );
        entry.append(icon(window), copy);
        return entry;
    }

    function renderSelection() {
        const entries = list.querySelectorAll(".window-entry");
        entries.forEach((entry, index) => {
            const active = index === selected;
            entry.classList.toggle("selected", active);
            entry.setAttribute("aria-selected", String(active));
        });
        const active = entries[selected];
        active?.scrollIntoView({ block: "nearest" });
    }

    function render() {
        list.replaceChildren(...windows.map(createEntry));
        renderSelection();
    }

    function receive(event) {
        bridgeReady = true;
        if (!event) return;
        if (event.type === "alttab.open") {
            windows = Array.isArray(event.payload?.windows) ? event.payload.windows : [];
            selected = Number.isInteger(event.payload?.selected) ? event.payload.selected : 0;
            selected = Math.max(0, Math.min(selected, windows.length - 1));
            render();
            shell.classList.add("visible");
            shell.setAttribute("aria-hidden", "false");
            queueMicrotask(() => send("alttab.rendered"));
            return;
        }
        if (event.type === "alttab.selection") {
            selected = Number.isInteger(event.payload?.selected) ? event.payload.selected : selected;
            selected = Math.max(0, Math.min(selected, windows.length - 1));
            renderSelection();
            return;
        }
        if (event.type === "alttab.closed") {
            shell.classList.remove("visible");
            shell.setAttribute("aria-hidden", "true");
        }
    }

    function send(type, payload = {}) {
        window.webkit?.messageHandlers?.plater?.postMessage({ type, payload });
    }

    window.plater = Object.freeze({ receive });
    for (const delay of [0, 100, 500, 1500]) {
        setTimeout(() => {
            if (!bridgeReady) send("ui.ready");
        }, delay);
    }
})();
