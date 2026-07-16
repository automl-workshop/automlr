const palettes = {
  dark: {
    label: "Dark + steel",
    colors: ["#0C0C0E", "#ECEAE3", "#7FA1C1"],
    vars: {
      paper: "#0C0C0E", surface: "#131316", ink: "#ECEAE3", "ink-soft": "#CBC8C0",
      muted: "#949089", faint: "#85837C", line: "#24252C", "line-strong": "#34353E",
      accent: "#7FA1C1", "accent-deep": "#A9C5DE", "accent-wash": "#151D25",
      "accent-bright": "#C6DCF0", "author-signal": "#A982C4", "footer-ink": "#060609",
      "footer-paper": "#DEDBD3", "footer-faint": "#706E67", "footer-line": "#1F2027",
    },
  },
  porcelain: {
    label: "Porcelain + ultramarine",
    colors: ["#F7F7F3", "#191B20", "#2948C8"],
    vars: {
      paper: "#F7F7F3", surface: "#EEEEEA", ink: "#191B20", "ink-soft": "#35383F",
      muted: "#666A72", faint: "#757982", line: "#D9D9D3", "line-strong": "#B4B5AE",
      accent: "#2948C8", "accent-deep": "#1E369D", "accent-wash": "#E3E7F7",
      "accent-bright": "#4665E1", "author-signal": "#7355A5", "footer-ink": "#191B20",
      "footer-paper": "#F2F2ED", "footer-faint": "#9A9CA2", "footer-line": "#3C3E44",
    },
  },
  porcelain2: {
    label: "Porcelain II",
    colors: ["#F5F4EE", "#181A1F", "#3049D0"],
    vars: {
      paper: "#F5F4EE", surface: "#ECEBE4", ink: "#181A1F", "ink-soft": "#34373D",
      muted: "#63676E", faint: "#72767E", line: "#D6D5CD", "line-strong": "#B1B1A9",
      accent: "#3049D0", "accent-deep": "#2439A5", "accent-wash": "#E3E6F7",
      "accent-bright": "#4C64E3", "author-signal": "#287F79", "footer-ink": "#181A1F",
      "footer-paper": "#F1F0EA", "footer-faint": "#999BA0", "footer-line": "#3A3C42",
    },
  },
  glacier: {
    label: "Glacier + teal",
    colors: ["#F1F6F5", "#152321", "#147D78"],
    vars: {
      paper: "#F1F6F5", surface: "#E5EEEC", ink: "#152321", "ink-soft": "#30423F",
      muted: "#62716E", faint: "#71807D", line: "#CEDBD8", "line-strong": "#A5B8B4",
      accent: "#147D78", "accent-deep": "#0D625E", "accent-wash": "#DCEDEB",
      "accent-bright": "#269B95", "author-signal": "#665ACD", "footer-ink": "#152321",
      "footer-paper": "#EDF4F2", "footer-faint": "#91A09D", "footer-line": "#334744",
    },
  },
  mist: {
    label: "Mist + cobalt",
    colors: ["#F3F5F2", "#17211F", "#315FCE"],
    vars: {
      paper: "#F3F5F2", surface: "#E8ECE8", ink: "#17211F", "ink-soft": "#33413D",
      muted: "#66716D", faint: "#737E7A", line: "#D1D8D4", "line-strong": "#AAB6B1",
      accent: "#315FCE", "accent-deep": "#244BA9", "accent-wash": "#E0E7F6",
      "accent-bright": "#4A78E4", "author-signal": "#8059B5", "footer-ink": "#17211F",
      "footer-paper": "#EDF1EE", "footer-faint": "#929D98", "footer-line": "#35423E",
    },
  },
  lilac: {
    label: "Lilac + indigo",
    colors: ["#F5F2F8", "#211D29", "#5B57C7"],
    vars: {
      paper: "#F5F2F8", surface: "#EBE6F0", ink: "#211D29", "ink-soft": "#3D3748",
      muted: "#6B6475", faint: "#797181", line: "#D9D1E0", "line-strong": "#B7ABC0",
      accent: "#5B57C7", "accent-deep": "#413DA3", "accent-wash": "#E5E2F5",
      "accent-bright": "#7772DD", "author-signal": "#27877E", "footer-ink": "#211D29",
      "footer-paper": "#F0ECF3", "footer-faint": "#A19AA8", "footer-line": "#423B4B",
    },
  },
  seaglass: {
    label: "Sea glass + navy",
    colors: ["#EFF5F0", "#17221D", "#315C9B"],
    vars: {
      paper: "#EFF5F0", surface: "#E4EDE6", ink: "#17221D", "ink-soft": "#34423A",
      muted: "#647168", faint: "#738077", line: "#CDD9D0", "line-strong": "#A6B7AA",
      accent: "#315C9B", "accent-deep": "#234779", "accent-wash": "#DEE8EF",
      "accent-bright": "#4D78B5", "author-signal": "#765FAF", "footer-ink": "#17221D",
      "footer-paper": "#ECF3ED", "footer-faint": "#94A097", "footer-line": "#35453C",
    },
  },
};

const storageKey = "automlr-color-lab";
const root = document.documentElement;
const bar = document.createElement("div");
bar.id = "color-lab";
bar.innerHTML = `<strong>Colour lab</strong><div class="palette-list"></div><button type="button" data-copy>Copy CSS</button>`;
document.body.prepend(bar);

const output = document.createElement("div");
output.id = "color-lab-output";
document.body.append(output);
const list = bar.querySelector(".palette-list");

function applyPalette(key) {
  const palette = palettes[key];
  for (const [name, value] of Object.entries(palette.vars)) root.style.setProperty(`--${name}`, value);
  document.body.dataset.palette = key;
  localStorage.setItem(storageKey, key);
  list.querySelectorAll("button").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.palette === key));
  });
  window.dispatchEvent(new CustomEvent("automlr:themechange"));
}

function flash(message) {
  output.textContent = message;
  output.classList.add("show");
  window.setTimeout(() => output.classList.remove("show"), 1800);
}

for (const [key, palette] of Object.entries(palettes)) {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.palette = key;
  button.innerHTML = `<span class="swatches">${palette.colors.map((color) => `<i style="background:${color}"></i>`).join("")}</span>${palette.label}`;
  button.addEventListener("click", () => applyPalette(key));
  list.append(button);
}

bar.querySelector("[data-copy]").addEventListener("click", async () => {
  const palette = palettes[document.body.dataset.palette || "dark"];
  const css = Object.entries(palette.vars).map(([name, value]) => `  --${name}: ${value};`).join("\n");
  await navigator.clipboard.writeText(`:root {\n${css}\n}`);
  flash(`${palette.label} CSS copied`);
});

const initial = localStorage.getItem(storageKey);
applyPalette(palettes[initial] ? initial : "mist");
