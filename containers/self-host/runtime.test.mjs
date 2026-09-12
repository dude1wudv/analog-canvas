import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderRuntimeConfig } from "./runtime-config.mjs";

// The repository's regular `test:local` includes this file, while the
// process-level checks below also need to run with Node's native test runner.
// Select the host test API without changing the test body or production code.
const testApi = process.env.VITEST
  ? await import("vitest").then(({ afterAll, beforeAll, test }) => ({
      after: afterAll,
      before: beforeAll,
      test,
    }))
  : await import("node:test").then(({ test }) => ({
      after: test.after,
      before: test.before,
      test,
    }));
const { after, before, test } = testApi;

const selfHostDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(selfHostDir, "../..");
const bundlePath = resolve(repoRoot, "dist/self-host/worker.js");
const schemaPath = resolve(repoRoot, "node_modules/workerd/workerd.capnp");
const initSecretsPath = resolve(selfHostDir, "init-secrets.mjs");
const fixturePath = resolve(
  repoRoot,
  "fixtures/projects/minimal/project.icproj.json",
);

let tempRoot;
let secretsDir;
let dataDir;
let assetsDir;
let configPath;
let assetsServer;
let runtime;
let origin;
let runtimeBase;
let projectText;
let adminPassword;

function workerdCommand() {
  if (process.env.WORKERD_BIN) {
    return { command: process.env.WORKERD_BIN, args: [] };
  }
  // Use workerd's Node launcher so the test works on Windows and Linux
  // without hard-coding a platform package path. The launcher then selects
  // the installed native binary.
  return {
    command: process.execPath,
    args: [resolve(repoRoot, "node_modules/workerd/bin/workerd")],
  };
}

function runNodeScript(script, argument) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [script, argument], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += String(chunk)));
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));
    child.once("error", reject);
    child.once("close", (code, signal) =>
      resolvePromise({ code, signal, stdout, stderr }),
    );
  });
}

async function freePort() {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolvePromise);
  });
  const address = server.address();
  assert.equal(typeof address, "object");
  const port = address.port;
  await new Promise((resolvePromise, reject) => {
    server.close((error) => (error ? reject(error) : resolvePromise()));
  });
  return port;
}

function contentType(pathname) {
  if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
  if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
  return "text/html; charset=utf-8";
}

function startAssetsServer(port) {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://assets").pathname;
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const candidate = resolve(assetsDir, relative);
    if (
      !candidate.startsWith(
        `${assetsDir}${process.platform === "win32" ? "\\" : "/"}`,
      )
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    try {
      const body = await readFile(candidate);
      response.writeHead(200, {
        "content-type": contentType(pathname),
        "content-length": String(body.byteLength),
      });
      response.end(body);
    } catch {
      if (!pathname.startsWith("/assets/")) {
        try {
          const body = await readFile(join(assetsDir, "index.html"));
          response.writeHead(200, { "content-type": contentType(".html") });
          response.end(body);
          return;
        } catch {
          // Fall through to the ordinary missing response.
        }
      }
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolvePromise(server));
  });
}

async function waitFor(url, child, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(
        `workerd exited before readiness (${child.exitCode}): ${child.stderrText}`,
      );
    }
    try {
      const response = await fetch(url);
      if (response.status > 0) return response;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`workerd did not become ready: ${lastError ?? "timeout"}`);
}

async function stopRuntime() {
  if (!runtime || runtime.exitCode !== null) return;
  runtime.kill("SIGTERM");
  await Promise.race([
    runtime.exitPromise,
    new Promise((resolvePromise) => setTimeout(resolvePromise, 3000)),
  ]);
  if (runtime.exitCode === null) runtime.kill("SIGKILL");
  await runtime.exitPromise.catch(() => undefined);
  runtime = undefined;
}

function cookieOf(response) {
  const value = response.headers.get("set-cookie") ?? "";
  const match = /(?:^|,\s*)(icm_session=[^;]+)/u.exec(value);
  assert.ok(match, "local auth response should issue a session cookie");
  return match[1];
}

function requestOptions(cookie, body) {
  return {
    headers: {
      Origin: origin,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    ...(body === undefined
      ? {}
      : { method: "POST", body: JSON.stringify(body) }),
  };
}

before(async () => {
  // Keep the temporary config on the same volume as the checkout. Cap'n
  // Proto's `embed` paths are relative to the config file and Windows cannot
  // represent a relative path between different drive letters.
  tempRoot = await mkdtemp(join(repoRoot, ".analog-self-host-"));
  secretsDir = join(tempRoot, "secrets");
  dataDir = join(tempRoot, "data");
  assetsDir = join(tempRoot, "assets");
  configPath = join(tempRoot, "workerd.capnp");
  await mkdir(secretsDir, { recursive: true, mode: 0o700 });
  await mkdir(dataDir, { recursive: true, mode: 0o700 });
  await mkdir(assetsDir, { recursive: true, mode: 0o755 });
  await writeFile(
    join(assetsDir, "index.html"),
    "<!doctype html><title>probe</title>",
  );
  projectText = await readFile(fixturePath, "utf8");

  const initialized = await runNodeScript(initSecretsPath, secretsDir);
  assert.equal(initialized.code, 0, initialized.stderr);
  adminPassword = (
    await readFile(join(secretsDir, "admin-password"), "utf8")
  ).trim();

  assert.ok(await stat(bundlePath), `missing Worker bundle: ${bundlePath}`);
  assert.ok(await stat(schemaPath), `missing workerd schema: ${schemaPath}`);

  const assetsPort = await freePort();
  const appPort = await freePort();
  const simulatorPort = await freePort();
  origin = "https://canvas.test";
  runtimeBase = `http://127.0.0.1:${appPort}`;
  assetsServer = await startAssetsServer(assetsPort);
  await writeFile(
    configPath,
    renderRuntimeConfig({
      configPath,
      bundlePath,
      schemaPath,
      secretDir: secretsDir,
      dataDir,
      origin,
      revision: "test",
      adminUsername: "sun",
      assetsAddress: `127.0.0.1:${assetsPort}`,
      simulationAddress: `127.0.0.1:${simulatorPort}`,
      socketAddress: `127.0.0.1:${appPort}`,
    }),
    { mode: 0o600 },
  );

  const executable = workerdCommand();
  const child = spawn(
    executable.command,
    [...executable.args, "serve", "--experimental", configPath],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdoutText = "";
  child.stderrText = "";
  child.stdout.on("data", (chunk) => {
    child.stdoutText += String(chunk);
    if (child.stdoutText.length > 4000)
      child.stdoutText = child.stdoutText.slice(-4000);
  });
  child.stderr.on("data", (chunk) => {
    child.stderrText += String(chunk);
    if (child.stderrText.length > 4000)
      child.stderrText = child.stderrText.slice(-4000);
  });
  child.exitPromise = new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("close", resolvePromise);
  });
  runtime = child;
  const health = await waitFor(`${runtimeBase}/health`, child);
  assert.equal(health.status, 200);
});

after(async () => {
  await stopRuntime();
  if (assetsServer) {
    await new Promise((resolvePromise) => assetsServer.close(resolvePromise));
    assetsServer = undefined;
  }
  if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
});

test("initializes server secrets idempotently and preserves existing values", async () => {
  const initDir = join(tempRoot, "init-secrets");
  const first = await runNodeScript(initSecretsPath, initDir);
  assert.equal(first.code, 0, first.stderr);
  const names = [
    "admin-password",
    "admin-password-hash",
    "simulation-token",
    "analytics-key",
    "runtime.env",
  ];
  const before = await Promise.all(
    names.map(async (name) => [
      name,
      await readFile(join(initDir, name), "utf8"),
    ]),
  );
  assert.match(
    before.find(([name]) => name === "admin-password-hash")[1],
    /^scrypt\$32768\$8\$3\$/u,
  );
  const second = await runNodeScript(initSecretsPath, initDir);
  assert.equal(second.code, 0, second.stderr);
  const after = await Promise.all(
    names.map(async (name) => [
      name,
      await readFile(join(initDir, name), "utf8"),
    ]),
  );
  assert.deepEqual(after, before);
});

test("renders all four SQLite Durable Object namespaces and explicit services", async () => {
  const config = await readFile(configPath, "utf8");
  for (const name of ["AnalyticsDO", "AgentSessionDO", "GalleryDO", "AuthDO"]) {
    assert.match(config, new RegExp(`className = "${name}"`));
  }
  assert.match(config, /durableObjectStorage = \(localDisk = "data"\)/u);
  assert.match(config, /\(name = "ASSETS", service = "assets"\)/u);
  assert.match(
    config,
    /\(name = "SIMULATION_SERVICE", service = "simulator"\)/u,
  );
  assert.match(
    config,
    /\(name = "internet", network = \(allow = \["public"\]/u,
  );
  assert.match(config, /\(name = "data", disk = \(path = /u);
});

test("serves assets through the external static service", async () => {
  const response = await fetch(`${runtimeBase}/editor`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /<!doctype html>/iu);
});

test("exposes local auth, registers a user, and persists a Cloud Project across restart", async () => {
  const providers = await fetch(`${runtimeBase}/api/auth/providers`);
  assert.equal(providers.status, 200);
  assert.deepEqual(await providers.json(), {
    github: false,
    google: false,
    email: false,
    local: true,
  });

  const adminLogin = await fetch(
    `${runtimeBase}/api/auth/local/login`,
    requestOptions(undefined, { username: "sun", password: adminPassword }),
  );
  assert.equal(adminLogin.status, 200);
  assert.equal((await adminLogin.json()).user.displayName, "sun");

  const username = `probe_${Date.now().toString(36)}`;
  const password = "probe-password-123";
  const register = await fetch(
    `${runtimeBase}/api/auth/local/register`,
    requestOptions(undefined, { username, password }),
  );
  assert.equal(register.status, 201);
  const cookie = cookieOf(register);
  const me = await fetch(`${runtimeBase}/api/auth/me`, requestOptions(cookie));
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.provider, "local");

  const create = await fetch(
    `${runtimeBase}/api/projects`,
    requestOptions(cookie, { name: "Runtime probe", projectText }),
  );
  assert.equal(create.status, 201);
  const created = (await create.json()).project;
  assert.equal(created.name, "Runtime probe");
  assert.equal(created.revision, 1);

  const list = await fetch(
    `${runtimeBase}/api/projects`,
    requestOptions(cookie),
  );
  assert.equal(list.status, 200);
  assert.equal((await list.json()).projects[0].id, created.id);

  await stopRuntime();
  const executable = workerdCommand();
  const child = spawn(
    executable.command,
    [...executable.args, "serve", "--experimental", configPath],
    { cwd: repoRoot, stdio: ["ignore", "pipe", "pipe"] },
  );
  child.stdoutText = "";
  child.stderrText = "";
  child.stdout.on("data", (chunk) => (child.stdoutText += String(chunk)));
  child.stderr.on("data", (chunk) => (child.stderrText += String(chunk)));
  child.exitPromise = new Promise((resolvePromise, reject) => {
    child.once("error", reject);
    child.once("close", resolvePromise);
  });
  runtime = child;
  const restartedHealth = await waitFor(`${runtimeBase}/health`, child);
  assert.equal(restartedHealth.status, 200);

  const reopenedMe = await fetch(
    `${runtimeBase}/api/auth/me`,
    requestOptions(cookie),
  );
  assert.equal(reopenedMe.status, 200);
  assert.equal((await reopenedMe.json()).user.displayName, username);

  const reopened = await fetch(
    `${runtimeBase}/api/projects/${encodeURIComponent(created.id)}`,
    requestOptions(cookie),
  );
  assert.equal(reopened.status, 200);
  const reopenedProject = (await reopened.json()).project;
  assert.equal(reopenedProject.id, created.id);
  assert.equal(reopenedProject.projectText, projectText);
});
