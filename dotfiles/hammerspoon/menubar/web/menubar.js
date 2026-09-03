(() => {
  "use strict";

  const nodes = Object.fromEntries(
    ["day", "date", "clock", "workspaces", "empty", "caffeinate", "power", "cpu", "ram"]
      .map(id => [id, document.getElementById(id)])
  );
  let workspaceKey = "";

  function text(node, value) {
    const next = String(value ?? "—");
    if (node.textContent !== next) node.textContent = next;
  }

  function receive(event) {
    if (!event || event.type !== "menubar.update" || !event.payload) return;
    const state = event.payload;
    document.body.dataset.screen = state.screen || "";
    text(nodes.day, state.clock?.day);
    text(nodes.date, state.clock?.date);
    text(nodes.clock, state.clock?.time);
    text(nodes.power, state.power);
    text(nodes.cpu, state.cpu);
    text(nodes.ram, state.ram);
    nodes.power.setAttribute("aria-label", `System power: ${state.power || "unavailable"}`);
    nodes.cpu.setAttribute("aria-label", `CPU usage: ${state.cpu || "unavailable"}`);
    nodes.ram.setAttribute("aria-label", `Memory usage: ${state.ram || "unavailable"}`);

    // Empty Lua tables can decode as objects, so normalize the list here.
    const workspaces = Array.isArray(state.workspaces) ? state.workspaces.map(String) : [];
    const nextWorkspaceKey = JSON.stringify([workspaces, state.focused]);
    if (nextWorkspaceKey !== workspaceKey) {
      const items = workspaces.map(name => {
        const item = document.createElement("li");
        item.className = "item workspace";
        item.textContent = name;
        item.setAttribute("aria-label", `Workspace ${name}`);
        item.setAttribute("aria-current", String(name === String(state.focused)));
        return item;
      });
      nodes.workspaces.replaceChildren(...items);
      nodes.workspaces.hidden = workspaces.length === 0;
      nodes.empty.hidden = workspaces.length !== 0;
      workspaceKey = nextWorkspaceKey;
    }

    const mode = state.caffeinate?.display ? "display" : state.caffeinate?.system ? "system" : "idle";
    nodes.caffeinate.dataset.mode = mode;
    text(nodes.caffeinate, { display: "CAF", system: "SYS", idle: "IDLE" }[mode]);
    nodes.caffeinate.title = {
      display: "Display sleep prevented", system: "System sleep prevented", idle: "Sleep prevention disabled"
    }[mode];
    document.body.dataset.ready = "true";
  }

  window.plater = Object.freeze({ receive });
  window.webkit?.messageHandlers?.plater?.postMessage({ type: "ui.ready" });
})();
