// --import entry: register the vscode resolve hook for the test run.
import { register } from "node:module";

register("./vscode-loader.mjs", import.meta.url);
