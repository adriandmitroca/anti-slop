import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Run after `tsc`: presets are derived from the compiled plugins so every new rule joins its preset.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { name } = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const { default: plugin } = await import(join(root, "dist/index.js"));
const { default: effectPlugin } = await import(join(root, "dist/effect/index.js"));

function preset(specifier, pluginObject, extraRules) {
  const rules = { ...extraRules };
  for (const rule of Object.keys(pluginObject.rules)) rules[`${pluginObject.meta.name}/${rule}`] = "error";
  return { jsPlugins: [specifier], rules };
}

const presets = {
  recommended: preset(name, plugin, { "oxc/no-accumulating-spread": "error" }),
  effect: preset(`${name}/effect`, effectPlugin, {}),
};

const destination = join(root, "configs");
rmSync(destination, { recursive: true, force: true });
mkdirSync(destination);
for (const [presetName, config] of Object.entries(presets)) {
  writeFileSync(join(destination, `${presetName}.json`), `${JSON.stringify(config, null, 2)}\n`);
}
writeFileSync(
  join(destination, "index.js"),
  Object.entries(presets)
    .map(([presetName, config]) => `export const ${presetName} = ${JSON.stringify(config, null, 2)};\n`)
    .join("\n"),
);
writeFileSync(
  join(destination, "index.d.ts"),
  `type Preset = { jsPlugins: string[]; rules: Record<string, "error"> };\n\n${Object.keys(presets)
    .map((presetName) => `export declare const ${presetName}: Preset;\n`)
    .join("")}`,
);
