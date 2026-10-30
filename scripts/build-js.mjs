import { build } from "esbuild";
import { SpinEsbuildPlugin } from "@spinframework/build-tools/plugins/esbuild";

const language = process.argv[2];
if (!["javascript", "typescript"].includes(language)) {
  throw new Error("Expected javascript or typescript");
}
const extension = language === "typescript" ? "ts" : "js";
await build({
  entryPoints: [`components/${language}/index.${extension}`],
  outfile: `components/${language}/build/bundle.js`,
  bundle: true,
  format: "esm",
  platform: "browser",
  plugins: [await SpinEsbuildPlugin({
    componentize: {
      output: `components/${language}/app.wasm`,
      initLocation: "http://localhost",
    },
  })],
});