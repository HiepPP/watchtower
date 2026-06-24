// @ts-nocheck
const vscode = acquireVsCodeApi();
const toast = document.getElementById("toast");
let toastTimer = 0;
const state = vscode.getState() || { collapsed: {} };

// Persist scroll across wholesale HTML re-renders (refresh() rewrites webview.html).
// vscode state survives re-renders, so restoring on script load keeps position.
let scrollTimer = 0;
function rememberScroll() {
  window.clearTimeout(scrollTimer);
  scrollTimer = window.setTimeout(() => {
    state.scrollTop = window.scrollY;
    vscode.setState(state);
  }, 80);
}

function showToast(text) {
  if (!toast) return;
  toast.textContent = text;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 1500);
}

function isActivator(e) {
  return e.key === "Enter" || e.key === " ";
}

function rememberSection(sec, collapsed) {
  const id = sec.dataset.sectionId;
  if (!id) return;
  state.collapsed = state.collapsed || {};
  state.collapsed[id] = collapsed;
  vscode.setState(state);
}

function applySectionState() {
  const collapsed = state.collapsed || {};
  for (const sec of document.querySelectorAll(".section[data-section-id]")) {
    const id = sec.dataset.sectionId;
    if (!id || typeof collapsed[id] !== "boolean") continue;
    sec.classList.toggle("collapsed", collapsed[id]);
    const head = sec.querySelector(".sec-head");
    if (head) head.setAttribute("aria-expanded", collapsed[id] ? "false" : "true");
  }
}

applySectionState();

// Restore scroll after re-render. Re-run on every load since refresh rewrites html.
if (typeof state.scrollTop === "number" && state.scrollTop > 0) {
  window.scrollTo(0, state.scrollTop);
}

window.addEventListener("scroll", rememberScroll, { passive: true });

document.addEventListener("click", (e) => {
  const head = e.target.closest(".sec-head");
  if (head && head.parentElement) {
    const sec = head.parentElement;
    const collapsed = sec.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    rememberSection(sec, collapsed);
    return;
  }

  const menu = e.target.closest(".row-menu");
  const el = e.target.closest("[data-action]");
  if (!el) return;
  if (menu && !menu.contains(el)) return;
  const action = el.dataset.action;
  switch (action) {
    case "open":
    case "openNext":
    case "openArchive":
      vscode.postMessage({ type: action, fsPath: el.dataset.path ?? "" });
      break;
    case "copy":
      vscode.postMessage({ type: "copy", text: el.dataset.text ?? "" });
      if (menu) menu.open = false;
      break;
    case "archive":
      vscode.postMessage({ type: "archive" });
      break;
    case "refresh":
      vscode.postMessage({ type: "refresh" });
      break;
  }
});

document.addEventListener("keydown", (e) => {
  if (!isActivator(e)) return;
  const menu = e.target.closest(".row-menu");
  const el = e.target.closest('[role="button"][data-action]');
  if (!el) return;
  if (menu && !menu.contains(el)) return;
  e.preventDefault();
  el.click();
});

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg && msg.type === "toast" && typeof msg.text === "string") {
    showToast(msg.text);
  }
});
