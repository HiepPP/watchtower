// Test-only ESM resolve hook. The real "vscode" module exists only inside the
// VS Code extension host; esbuild marks it external. Node unit tests that import
// a module which imports "vscode" need a runtime stub. Redirect "vscode" to a
// tiny data: URL module exposing the classes our pure code constructs.
const stub = [
  "export class ThemeColor { constructor(id) { this.id = id; } }",
  "export class ThemeIcon { constructor(id, color) { this.id = id; this.color = color; } }",
].join("\n");

const stubUrl = "data:text/javascript," + encodeURIComponent(stub);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "vscode") {
    return { url: stubUrl, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
