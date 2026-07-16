const selector = [
  ".wordmark > span:last-child", ".nav-links a", ".hero h1", ".hero p",
  ".hero .arrow-link", ".facts dt", ".facts dd", ".section-index",
  ".article-body h2", ".article-body h3", ".article-body p", ".article-body blockquote p",
  ".paper-parts li > span", ".stages li > span", ".expander > summary",
  ".date-list time", ".date-list span", ".schedule p > span", ".person-name", ".person-aff",
  ".submission-status .pending", ".contact h2", ".contact p", ".mailto-name",
  ".site-footer p", ".footer-meta span",
].join(",");

const candidates = [...document.querySelectorAll(selector)].filter(
  (element) => !element.parentElement?.closest(selector),
);
const original = new Map();

const bar = document.createElement("div");
bar.id = "copy-editor-bar";
bar.innerHTML = `
  <strong>Copy editor</strong>
  <span class="copy-editor-help">Click outlined text and type directly.</span>
  <span class="copy-editor-status">No unsaved changes</span>
  <button type="button" data-revert disabled>Revert</button>
  <button type="button" data-save disabled>Save to index.html</button>
`;
document.body.prepend(bar);

const toast = document.createElement("div");
toast.id = "copy-editor-toast";
document.body.append(toast);

const status = bar.querySelector(".copy-editor-status");
const saveButton = bar.querySelector("[data-save]");
const revertButton = bar.querySelector("[data-revert]");

function changedElements() {
  return candidates.filter((element) => element.innerHTML !== original.get(element));
}

function updateState() {
  const changed = changedElements();
  candidates.forEach((element) => {
    element.dataset.copyDirty = String(changed.includes(element));
  });
  status.textContent = changed.length
    ? `${changed.length} unsaved change${changed.length === 1 ? "" : "s"}`
    : "No unsaved changes";
  saveButton.disabled = changed.length === 0;
  revertButton.disabled = changed.length === 0;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}

candidates.forEach((element) => {
  original.set(element, element.innerHTML);
  element.contentEditable = "true";
  element.spellcheck = true;
  element.dataset.copyEditable = "true";
  element.addEventListener("input", updateState);
  element.addEventListener("click", (event) => {
    if (element.closest("a")) event.preventDefault();
  });
  element.addEventListener("paste", (event) => {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
  });
});

revertButton.addEventListener("click", () => {
  for (const element of changedElements()) element.innerHTML = original.get(element);
  updateState();
  showToast("Unsaved edits reverted");
});

saveButton.addEventListener("click", async () => {
  const changed = changedElements();
  saveButton.disabled = true;
  status.textContent = "Saving…";
  try {
    const response = await fetch("/__copy-editor/save", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        edits: changed.map((element) => ({
          id: element.dataset.copyId,
          html: element.innerHTML,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Save failed");
    changed.forEach((element) => original.set(element, element.innerHTML));
    updateState();
    showToast(`Saved ${result.saved} change${result.saved === 1 ? "" : "s"} to public/index.html`);
  } catch (error) {
    status.textContent = error.message;
    saveButton.disabled = false;
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    if (!saveButton.disabled) saveButton.click();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (changedElements().length) event.preventDefault();
});
