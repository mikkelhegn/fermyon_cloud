import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse, stringify } from "smol-toml";

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

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const names = (process.argv[2] ?? "rust,javascript,typescript").split(",");
  const manifest = parse(await readFile("spin.toml", "utf8"));
  await writeFile("spin.local.toml", stringify(selectComponents(manifest, names)));
  console.log(`Created spin.local.toml for: ${names.join(", ")}`);
}