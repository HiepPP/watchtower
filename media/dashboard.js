// @ts-nocheck
const vscode = acquireVsCodeApi();
const toast = document.getElementById("toast");
let toastTimer = 0;

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

document.addEventListener("click", (e) => {
  const head = e.target.closest(".sec-head");
  if (head && head.parentElement) {
    const sec = head.parentElement;
    const collapsed = sec.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", collapsed ? "false" : "true");
    return;
  }

  const el = e.target.closest("[data-action]");
  if (!el) return;
  const action = el.dataset.action;
  switch (action) {
    case "open":
    case "openNext":
    case "openArchive":
      vscode.postMessage({ type: action, fsPath: el.dataset.path ?? "" });
      break;
    case "copy":
      vscode.postMessage({ type: "copy", text: el.dataset.text ?? "" });
      break;
    case "refresh":
      vscode.postMessage({ type: "refresh" });
      break;
  }
});

document.addEventListener("keydown", (e) => {
  if (!isActivator(e)) return;
  const el = e.target.closest('[role="button"][data-action]');
  if (!el) return;
  e.preventDefault();
  el.click();
});

window.addEventListener("message", (e) => {
  const msg = e.data;
  if (msg && msg.type === "toast" && typeof msg.text === "string") {
    showToast(msg.text);
  }
});
