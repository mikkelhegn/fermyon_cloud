import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "smol-toml";
import { testExclusions } from "./language-reports.mjs";

export function selectComponents(manifest, names) {
  if (!names.length) throw new Error("Select at least one component");
  for (const name of names) {
    if (!manifest.component[name]) throw new Error(`Unknown component: ${name}`);
  }
  const selected = structuredClone(manifest);
  selected.component = Object.fromEntries(names.map((name) => [name, selected.component[name]]));
  selected.trigger.http = selected.trigger.http.filter((trigger) => names.includes(trigger.component));
  return selected;
}

export function selectTestComponents(manifest, names) {
  for (const name of names) {
    if (testExclusions[name]) throw new Error(`${name} is excluded from automated Spin tests: ${testExclusions[name]}`);
  }
  return selectComponents(manifest, names);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = (process.argv[2] ?? "rust,javascript,typescript").split(",");
  const manifest = parse(await readFile("spin.toml", "utf8"));
  const selected = process.argv.includes("--tested") ? selectTestComponents(manifest, names) : selectComponents(manifest, names);
  await writeFile("spin.local.toml", stringify(selected));
  console.log(`Created spin.local.toml for: ${names.join(", ")}`);
}