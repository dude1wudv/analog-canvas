import { relative, dirname, resolve } from "node:path";

export function renderRuntimeConfig({
  configPath,
  bundlePath,
  schemaPath,
  secretDir,
  dataDir,
  origin,
  revision,
  adminUsername = "sun",
  assetsAddress = "assets:80",
  simulationAddress = "simulator:8080",
  socketAddress = "*:8787",
}) {
  const url = new URL(origin);
  if (
    url.protocol !== "https:" ||
    url.origin !== origin ||
    url.username ||
    url.password
  )
    throw new Error("PUBLIC_ORIGIN must be a canonical HTTPS origin");
  if (!/^[a-z0-9_]{3,32}$/.test(adminUsername))
    throw new Error("Invalid local admin username");
  const quote = JSON.stringify;
  const file = (path) =>
    quote(
      relative(dirname(resolve(configPath)), resolve(path)).replaceAll(
        "\\",
        "/",
      ),
    );
  const names = [
    "Analytics",
    "AgentSession",
    "Gallery",
    "Auth",
    "ComponentLibrary",
    "TopologyTask",
  ];
  const bindingNames = [
    "ANALYTICS",
    "AGENT_SESSION",
    "GALLERY",
    "AUTH",
    "COMPONENT_LIBRARY",
    "TOPOLOGY_TASK",
  ];
  return `using Workerd = import ${file(schemaPath)};
const config :Workerd.Config = (
  services = [
    (name = "app", worker = (
      modules = [(name = "worker.js", esModule = embed ${file(bundlePath)})],
      compatibilityDate = "2026-08-11",
      durableObjectNamespaces = [
        ${names.map((name) => `(className = "${name}DO", uniqueKey = "analog-hk-${name.toLowerCase()}-v1", enableSql = true)`).join(",\n        ")}
      ],
      durableObjectStorage = (localDisk = "data"),
      bindings = [
        ${names.map((name, index) => `(name = "${bindingNames[index]}", durableObjectNamespace = (className = "${name}DO"))`).join(",\n        ")},
        (name = "ASSETS", service = "assets"),
        (name = "SIMULATION_SERVICE", service = "simulator"),
        (name = "SIMULATION_UPSTREAM_URL", text = "http://simulator:8080"),
        (name = "SIMULATION_DEFAULT_EXECUTOR", text = "operator-host"),
        (name = "SIMULATION_UPSTREAM_TOKEN", text = embed ${file(resolve(secretDir, "simulation-token"))}),
        (name = "PUBLIC_ORIGIN", text = ${quote(origin)}),
        (name = "AGENT_ALLOWED_ORIGIN", text = ${quote(origin)}),
        (name = "SOURCE_REVISION", text = ${quote(revision)}),
        (name = "AUTH_LOCAL_ENABLED", text = "true"),
        (name = "LOCAL_ADMIN_USERNAME", text = ${quote(adminUsername)}),
        (name = "LOCAL_ADMIN_PASSWORD_HASH", text = embed ${file(resolve(secretDir, "admin-password-hash"))}),
        (name = "ANALYTICS_KEY", text = embed ${file(resolve(secretDir, "analytics-key"))})
      ]
    )),
    (name = "assets", external = (address = ${quote(assetsAddress)}, http = ())),
    (name = "simulator", external = (address = ${quote(simulationAddress)}, http = ())),
    (name = "internet", network = (allow = ["public"], tlsOptions = (trustBrowserCas = true))),
    (name = "data", disk = (path = ${quote(resolve(dataDir).replaceAll("\\", "/"))}, writable = true))
  ],
  sockets = [(name = "http", address = ${quote(socketAddress)}, http = (forwardedProtoHeader = "X-Forwarded-Proto"), service = "app")]
);
`;
}
