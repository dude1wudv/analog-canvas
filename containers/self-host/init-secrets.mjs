import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, readFile, writeFile, chmod, chown } from "node:fs/promises";
import { resolve } from "node:path";

const directory = resolve(process.argv[2] ?? "/secrets");
await mkdir(directory, { recursive: true, mode: 0o700 });
async function keep(name, create) {
  const path = resolve(directory, name);
  try {
    await writeFile(path, await create(), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
  }
  await chmod(path, 0o600);
  if (process.getuid?.() === 0) await chown(path, 10001, 10001);
  return (await readFile(path, "utf8")).trim();
}
const password = await keep("admin-password", () =>
  randomBytes(24).toString("base64url"),
);
await keep("admin-password-hash", () => {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, {
    N: 32768,
    r: 8,
    p: 3,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$32768$8$3$${salt.toString("hex")}$${hash.toString("hex")}`;
});
const simulationToken = await keep("simulation-token", () =>
  randomBytes(32).toString("hex"),
);
await keep("analytics-key", () => randomBytes(32).toString("hex"));
await keep("runtime.env", () => `SIMULATION_ACCESS_TOKEN=${simulationToken}\n`);
await chmod(directory, 0o700);
if (process.getuid?.() === 0) await chown(directory, 10001, 10001);
process.stdout.write(
  "Server-only secrets initialized; existing values preserved.\n",
);
