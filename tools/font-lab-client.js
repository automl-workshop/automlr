const systems = {
  current: {
    label: "Current mix",
    display: '"Fraunces", Georgia, serif',
    body: '"Newsreader", Georgia, serif',
    utility: '"IBM Plex Mono", ui-monospace, monospace',
  },
  dm: {
    label: "DM editorial",
    display: '"DM Serif Display", Georgia, serif',
    body: '"DM Sans", Arial, sans-serif',
    utility: '"IBM Plex Mono", ui-monospace, monospace',
  },
};

const storageKey = "automlr-font-lab";
const root = document.documentElement;
const bar = document.createElement("div");
bar.id = "font-lab";
bar.innerHTML = `<strong>Font A/B</strong><div class="font-list"></div><button type="button" data-copy>Copy CSS</button>`;
document.body.prepend(bar);

const output = document.createElement("div");
output.id = "font-lab-output";
document.body.append(output);
const list = bar.querySelector(".font-list");

function applySystem(key) {
  const system = systems[key];
  root.style.setProperty("--serif-display", system.display);
  root.style.setProperty("--serif-body", system.body);
  root.style.setProperty("--mono", system.utility);
  document.body.dataset.fontSystem = key;
  localStorage.setItem(storageKey, key);
  list.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.system === key));
  });
}

function flash(message) {
  output.textContent = message;
  output.classList.add("show");
  window.setTimeout(() => output.classList.remove("show"), 1800);
}

for (const [key, system] of Object.entries(systems)) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.system = key;
  button.textContent = system.label;
  button.addEventListener("click", () => applySystem(key));
  list.append(button);
}

bar.querySelector("[data-copy]").addEventListener("click", async () => {
  const system = systems[document.body.dataset.fontSystem || "current"];
  const css = `:root {\n  --serif-display: ${system.display};\n  --serif-body: ${system.body};\n  --mono: ${system.utility};\n}`;
  await navigator.clipboard.writeText(css);
  flash(`${system.label} CSS copied`);
});

const initial = localStorage.getItem(storageKey);
applySystem(systems[initial] ? initial : "current");
