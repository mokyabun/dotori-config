(() => {
  "use strict";

  let bridgeReady = false;
  const toast = document.querySelector(".toast");
  const standard = document.querySelector("#standard");
  const compact = document.querySelector("#compact");
  const icon = document.querySelector("#icon");
  const title = document.querySelector("#title");
  const subtitle = document.querySelector("#subtitle");
  const label = document.querySelector("#label");
  const value = document.querySelector("#value");

  function send(type, payload = {}) {
    window.webkit?.messageHandlers?.plater?.postMessage({ type, payload });
  }

  function receive(event) {
    bridgeReady = true;
    if (!event) return;
    if (event.type === "notify.show") {
      const payload = event.payload || {};
      const isCompact = payload.compact === true;
      toast.classList.toggle("compact", isCompact);
      standard.hidden = isCompact;
      compact.hidden = !isCompact;
      label.textContent = payload.label || "";
      value.textContent = payload.value || "";
      icon.textContent = payload.icon || "";
      icon.hidden = !payload.icon;
      title.textContent = payload.title || "";
      subtitle.textContent = payload.subtitle || "";
      subtitle.hidden = !payload.subtitle;
      toast.style.setProperty("--accent", payload.color || "#bd93f9");
      setVisible(false);
      queueMicrotask(() => send("notify.rendered"));
    } else if (event.type === "notify.focus") {
      requestAnimationFrame(() => setVisible(true));
    } else if (event.type === "notify.closed") {
      setVisible(false);
    }
  }

  function setVisible(visible) {
    toast.classList.toggle("visible", visible);
    toast.setAttribute("aria-hidden", String(!visible));
  }

  window.plater = Object.freeze({ receive });
  for (const delay of [0, 100, 500, 1500]) {
    setTimeout(() => {
      if (!bridgeReady) send("ui.ready");
    }, delay);
  }
})();
