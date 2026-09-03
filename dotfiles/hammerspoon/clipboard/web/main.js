(() => {
  "use strict";

  let bridgeReady = false;
  const state = {
    choices: [],
    query: "",
    results: [],
    selected: 0,
    visible: false,
    pointerReady: false,
    pointerTimer: undefined,
  };

  const shell = document.querySelector(".clipboard-shell");
  const input = document.querySelector("#clipboard-search");
  const resultsElement = document.querySelector("#clipboard-results");

  const normalize = (value) => String(value || "").toLocaleLowerCase().replace(/\s+/g, " ").trim();

  function score(choice, rawQuery, order) {
    const needle = normalize(rawQuery);
    if (!needle) return order;
    const haystack = normalize(choice.title);
    const direct = haystack.indexOf(needle);
    if (direct >= 0) return direct + (haystack.startsWith(needle) ? -100 : 0) + order / 1000;

    let cursor = 0;
    let spread = 0;
    let previous = -1;
    for (const character of needle) {
      const index = haystack.indexOf(character, cursor);
      if (index < 0) return Number.POSITIVE_INFINITY;
      if (previous >= 0) spread += index - previous - 1;
      previous = index;
      cursor = index + 1;
    }
    return 200 + spread * 4 + previous + order / 1000;
  }

  function element(tagName, className, text) {
    const node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function send(type, payload = {}) {
    window.webkit?.messageHandlers?.plater?.postMessage({ type, payload });
  }

  function choose(choice = state.results[state.selected]) {
    if (choice) send("clipboard.select", { id: choice.id });
  }

  function renderSelection() {
    const entries = resultsElement.querySelectorAll(".entry");
    entries.forEach((entry, index) => {
      const selected = index === state.selected;
      entry.classList.toggle("selected", selected);
      entry.setAttribute("aria-selected", String(selected));
    });
    if (state.results.length) {
      input.setAttribute("aria-activedescendant", `clipboard-option-${state.selected}`);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  function createEntry(choice, index) {
    const selected = index === state.selected;
    const button = element("button", `entry${selected ? " selected" : ""}`);
    button.type = "button";
    button.id = `clipboard-option-${index}`;
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(selected));
    button.append(
      element("span", "preview", choice.title || "Empty text"),
      element("span", "meta", choice.subtitle || "Clipboard item"),
    );
    button.addEventListener("mouseenter", () => {
      if (!state.pointerReady || state.selected === index) return;
      state.selected = index;
      renderSelection();
    });
    button.addEventListener("click", () => choose(choice));
    return button;
  }

  function render() {
    state.results = state.choices
      .map((choice, order) => ({ choice, score: score(choice, state.query, order) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map(({ choice }) => choice);
    state.selected = Math.min(state.selected, Math.max(0, state.results.length - 1));

    if (state.results.length) {
      resultsElement.replaceChildren(...state.results.map(createEntry));
    } else {
      const empty = element("div", "empty");
      empty.append(
        element("strong", "", state.choices.length ? "No match" : "Clipboard is empty"),
        element("p", "", state.choices.length ? "Try a different search." : "Copied text will appear here."),
      );
      resultsElement.replaceChildren(empty);
    }
    renderSelection();
  }

  function setVisible(visible) {
    state.visible = visible;
    shell.classList.toggle("visible", visible);
    shell.setAttribute("aria-hidden", String(!visible));
  }

  function receive(event) {
    bridgeReady = true;
    if (!event) return;
    if (event.type === "clipboard.open") {
      state.choices = Array.isArray(event.payload?.choices) ? event.payload.choices : [];
      state.query = "";
      state.selected = 0;
      state.pointerReady = false;
      input.value = "";
      clearTimeout(state.pointerTimer);
      state.pointerTimer = setTimeout(() => {
        state.pointerReady = true;
      }, 250);
      setVisible(false);
      render();
      queueMicrotask(() => send("clipboard.rendered"));
      return;
    }
    if (event.type === "clipboard.focus") {
      requestAnimationFrame(() => {
        setVisible(true);
        input.focus({ preventScroll: true });
      });
      return;
    }
    if (event.type === "clipboard.closed") {
      clearTimeout(state.pointerTimer);
      state.query = "";
      state.selected = 0;
      input.value = "";
      setVisible(false);
      render();
    }
  }

  input.addEventListener("input", () => {
    state.query = input.value;
    state.selected = 0;
    render();
  });

  window.addEventListener("keydown", (event) => {
    if (!state.visible) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      state.selected = state.results.length ? (state.selected + 1) % state.results.length : 0;
      renderSelection();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      state.selected = state.results.length
        ? (state.selected - 1 + state.results.length) % state.results.length
        : 0;
      renderSelection();
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose();
    } else if (event.key === "Escape") {
      event.preventDefault();
      send("clipboard.close");
    }
  });

  window.plater = Object.freeze({ receive });
  render();

  for (const delay of [0, 100, 500, 1500]) {
    setTimeout(() => {
      if (!bridgeReady) send("ui.ready");
    }, delay);
  }
})();
