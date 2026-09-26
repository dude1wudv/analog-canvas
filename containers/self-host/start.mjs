import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { renderRuntimeConfig } from "./runtime-config.mjs";

const configPath = "/tmp/analog-canvas/workerd.capnp";
await mkdir("/tmp/analog-canvas", { recursive: true, mode: 0o700 });
await writeFile(
  configPath,
  renderRuntimeConfig({
    configPath,
    bundlePath: "/app/worker.js",
    schemaPath: "/app/workerd.capnp",
    secretDir: "/secrets",
    dataDir: "/data",
    origin: process.env.PUBLIC_ORIGIN ?? "https://analog.microedulab.com",
    revision: process.env.SOURCE_REVISION ?? "codex/image-spice-import",
    adminUsername: process.env.LOCAL_ADMIN_USERNAME ?? "sun",
  }),
  { mode: 0o600 },
);
// No --watch, inspector, debug-port or privileged development proxy.
const child = spawn("workerd", ["serve", "--experimental", configPath], {
  stdio: "inherit",
});
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
child.on("error", () => process.exit(1));
child.on("exit", (code) => process.exit(code ?? 1));
