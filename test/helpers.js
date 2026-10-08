import fs from "node:fs";
import vm from "node:vm";

/** Evaluates a src/ script in a fresh context seeded with `globals`, and returns that context. */
export function loadScript(file, globals = {}, exportNames = []) {
  const context = vm.createContext({ console, ...globals });
  const source = fs.readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");
  vm.runInContext(`${source}\n;globalThis.__exports = { ${exportNames.join(", ")} };`, context);
  return context;
}

/** In-memory stand-in for chrome.storage.local. */
export function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    get: async (keys) => {
      const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(data);
      return Object.fromEntries(list.filter((k) => k in data).map((k) => [k, data[k]]));
    },
    set: async (values) => void Object.assign(data, values),
    remove: async (keys) => void [keys].flat().forEach((k) => delete data[k]),
  };
}
