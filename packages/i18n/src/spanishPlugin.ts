import type { Plugin } from "vite";
import es from "./locales/es.json";
import pluginEs from "./locales/pluginEs.json";
import { transformSource } from "./transform";

const catalog: Record<string, string> = { ...es, ...pluginEs };

export function spanishText(text: string) { return catalog[text] ?? text; }

// Compile display text into the bundled plugins; no translation runtime or user-data rewriting.
export function spanishPlugin(): Plugin {
  return {
    name: "editorSpanishPlugins",
    enforce: "pre",
    transform(source, id) {
      const path = id.replaceAll("\\", "/");
      if (!path.includes("/packages/") || path.includes("/node_modules/")) return;
      return transformSource(source, id, catalog);
    },
  };
}
