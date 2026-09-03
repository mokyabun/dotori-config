const listeners = new Set();
let bridgeReady = false;

const state = {
  choices: [],
  icons: {},
  query: "",
  results: [],
  selected: 0,
  visible: false,
  pointerReady: false,
  pointerTimer: undefined,
};

const shell = document.querySelector(".launcher-shell");
const input = document.querySelector("#launcher-search");
const resultsElement = document.querySelector("#launcher-results");

const normalize = (value) => value.toLocaleLowerCase().replace(/\s+/g, " ").trim();

function fuzzyScore(choice, rawQuery, order) {
  const needle = normalize(rawQuery);
  if (!needle) return order;

  const title = normalize(choice.title);
  const haystack = normalize(`${choice.title} ${choice.subtitle || ""}`);
  const direct = haystack.indexOf(needle);
  if (direct >= 0) {
    const titleBonus = title.startsWith(needle) ? -180 : title.includes(needle) ? -90 : 0;
    return direct + titleBonus + order / 1000;
  }

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
  return 220 + spread * 4 + previous + order / 1000;
}

function createElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createFallback(choice) {
  return createElement("span", "fallback", choice.monogram || "·");
}

function createIcon(choice) {
  const wrapper = createElement("span", "icon-wrap");
  const source = choice.bundleId && state.icons[choice.bundleId];
  if (!source) {
    wrapper.append(createFallback(choice));
    return wrapper;
  }

  const image = createElement("img");
  image.src = source;
  image.alt = "";
  image.draggable = false;
  image.addEventListener("error", () => wrapper.replaceChildren(createFallback(choice)), {
    once: true,
  });
  wrapper.append(image);
  return wrapper;
}

function choose(choice = state.results[state.selected]) {
  if (choice) window.plater.send("launcher.select", { id: choice.id });
}

function createResult(choice, index) {
  const selected = index === state.selected;
  const button = createElement("button", `result${selected ? " selected" : ""}`);
  button.type = "button";
  button.id = `launcher-option-${index}`;
  button.setAttribute("role", "option");
  button.setAttribute("aria-selected", String(selected));
  const copy = createElement("span", "copy");
  copy.append(
    createElement("strong", "title", choice.title),
    createElement("small", "subtitle", choice.subtitle || "Command"),
  );
  button.append(createIcon(choice), copy);

  button.addEventListener("mouseenter", () => {
    if (!state.pointerReady || state.selected === index) return;
    state.selected = index;
    renderSelection();
  });
  button.addEventListener("click", () => choose(choice));
  return button;
}

function renderSelection() {
  const options = resultsElement.querySelectorAll(".result");
  options.forEach((option, index) => {
    const selected = index === state.selected;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));
  });
  input.setAttribute(
    "aria-activedescendant",
    state.results.length ? `launcher-option-${state.selected}` : "",
  );
}

function renderResults() {
  state.results = state.choices
    .map((choice, order) => ({ choice, score: fuzzyScore(choice, state.query, order) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map(({ choice }) => choice);

  state.selected = Math.min(state.selected, Math.max(0, state.results.length - 1));

  if (!state.results.length) {
    const empty = createElement("div", "empty");
    empty.append(
      createElement("strong", "", "No match"),
      createElement("p", "", "Try another app or command name."),
    );
    resultsElement.replaceChildren(empty);
  } else {
    resultsElement.replaceChildren(...state.results.map(createResult));
  }
  renderSelection();
}

function setVisible(visible) {
  state.visible = visible;
  shell.classList.toggle("visible", visible);
  shell.setAttribute("aria-hidden", String(!visible));
}

function send(type, payload = {}) {
  window.webkit?.messageHandlers?.plater?.postMessage({ type, payload });
}

window.plater = Object.freeze({
  receive(event) {
    bridgeReady = true;
    for (const listener of listeners) listener(event);
  },
  send,
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
});

window.plater.subscribe((event) => {
  if (!event) return;
  if (event.type === "launcher.catalog") {
    state.choices = Array.isArray(event.payload?.choices) ? event.payload.choices : [];
    renderResults();
    return;
  }
  if (event.type === "launcher.icons") {
    state.icons = { ...state.icons, ...(event.payload?.icons || {}) };
    renderResults();
    return;
  }
  if (event.type === "launcher.open") {
    if (Array.isArray(event.payload?.choices)) state.choices = event.payload.choices;
    state.query = "";
    state.selected = 0;
    state.pointerReady = false;
    input.value = "";
    clearTimeout(state.pointerTimer);
    state.pointerTimer = setTimeout(() => {
      state.pointerReady = true;
    }, 250);
    setVisible(false);
    renderResults();
    queueMicrotask(() => window.plater.send("launcher.rendered"));
    return;
  }
  if (event.type === "launcher.focus") {
    requestAnimationFrame(() => {
      setVisible(true);
      input.focus({ preventScroll: true });
    });
    return;
  }
  if (event.type === "launcher.closed") {
    clearTimeout(state.pointerTimer);
    state.query = "";
    state.selected = 0;
    input.value = "";
    setVisible(false);
    renderResults();
  }
});

input.addEventListener("input", () => {
  state.query = input.value;
  state.selected = 0;
  renderResults();
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
    window.plater.send("launcher.close");
  }
});

renderResults();

// WKWebView can finish executing the document just before Hammerspoon starts
// accepting user-content messages. Retry only until Lua answers once.
for (const delay of [0, 100, 500, 1500]) {
  setTimeout(() => {
    if (!bridgeReady) send("ui.ready");
  }, delay);
}
