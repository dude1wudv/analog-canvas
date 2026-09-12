# Agent Integration Guide

The Agent Circuit API is a regular JSON/TypeScript API. It exposes a complete
Snapshot and typed edits through the same Schematic Edit Engine used by humans;
it does not bundle an LLM provider, browser automation, or a second command
engine.

## Choose the entry point

1. **Default: packaged local stdio MCP.** Install or unpack the Agent-side MCP adapter
   (`apps/mcp-server`, [ADR 0020](../adr/0020-agent-side-mcp-adapter.md)) and
   connect a host such as Codex, Claude Code, or Cursor to it. The adapter
   owns claim redemption, persistent connector resume, process-local bearers,
   revisions, idempotent retries, and compact tools; the model never sees
   tokens or the raw OpenAPI. The copied handoff names the exact server;
   use an existing adapter only when it targets that server and supports the
   editor's schema. See [mcp-install.md](mcp-install.md).
2. **Fallback: Kit + HTTP API.** For hosts without the packaged
   MCP entry point, fetch the public
   `GET /api/agent/kit` JSON, write its listed files to a private scratch
   directory, redeem the claim, and call the four operations directly. The
   handoff first recommends installing/updating MCP from the current manifest.
   If declined, blocked or unavailable in the current conversation, report the
   failed stage; use HTTP only when the user explicitly chooses it. That path
   needs no Agent host restart. Configuration success alone is not tool
   availability. Notify the user once if a restart or new conversation is
   needed, but do not perform it automatically.
3. **Advanced: direct OpenAPI.** `GET /api/agent/openapi.json` is the
   wire-contract authority for direct API integrations. An MCP-based Agent
   does not need it; `advanced_transact` reuses existing transaction forms.
   Read `analog-canvas://contract/advanced-edits` on demand, without a
   read-to-unlock ceremony.

For an MCP session: start the adapter, call `connect` with a Claim Code, read
`analog-canvas://reference/quickstart`, call
`get_context`, then operate. Knowledge documents surface as MCP Resources
declared by [`resource-manifest.json`](resource-manifest.json); the same
manifest projects the shared sources into the HTTP Kit.

## Browser-host availability

For run visibility, automatic browser archives and source/result exports, see
[simulation result handoff](simulation-result-handoff.md).

7: - `@icm/agent-routing` — Agent-local transient RouteGraph → typed-edit expander. ADR 0008: these types never enter the API schema or persisted model; Agent-side scaffolding with no in-repo importers.
- `@icm/platform-node` — Node filesystem storage/recovery adapters; no in-repo importers.
- `apps/editor` — the React/SVG editor and installable PWA, plus the Gallery, account, and moderation surfaces. `analytics/` is the self-contained first-party analytics module; `dev/` holds the Vite dev-server plugins (local Agent relay, netlist conversion, local simulation).
- `apps/local-host` — loopback-only static host for `apps/editor/dist` with a local simulation transport seam (`bin: interactive-circuit-maker`; its only dependency is `@icm/spice-run`).
- `apps/mcp-server` — stdio MCP server (`bin: analog-canvas-mcp`) over `agent-client`, with generated doc resources. Release packaging (`scripts/package-mcp.mjs`) bundles it with Vite and takes the version from `config/agent-mcp-distribution.json`, not from its `package.json`.
- `worker/` — self-hosted workerd Worker and the Cloudflare production Worker. Production deploys from a `v*` tag or an explicit commit via `.github/workflows/cloudflare.yml`; the former Cloudflare Preview channel has been retired.
8: The retired Cloudflare Preview channel is no longer an active deployment target. Use the self-hosted editor URL and the operator-host deployment procedure for active Agent/simulation work.

For local development, `pnpm dev` starts the real Agent relay on first use through the editor's own `/api/agent/` routes, including its WebSocket. No separate Worker process needs to be launched manually. Use the loopback origin in the copied message from an Agent on the same computer. The local relay does not start cloud account, Gallery, or hosted simulation services, and restarting the development server ends its in-memory sessions.

An unconfigured production build still keeps the Agent UI dormant. Explicit deployment flags control availability without changing the API or MCP contract.

## External Agent bootstrap (no MCP)

An Agent without this repository receives a connection setup from the editor.
It first fetches the public `GET /api/agent/kit` JSON, writes its listed files
to a private scratch directory, and reads `README.md` followed by the session
`SKILL.md`. The Kit contains a small static projection of reviewed built-in
Razavi authoring facts, but neither a Project, token, nor alternate API. The
Agent then redeems the claim and uses the published OpenAPI as the
wire-contract authority.

## Read in this order

1. Kit `README.md`, `skills/icm-circuit-session/SKILL.md`, and
   `references/authoring-contract.md` for an external session; repository
   contributors begin with the next document instead.
2. [`../specs/agent-api.md`](../specs/agent-api.md) — normative domain contract.
3. [`workflow.md`](workflow.md) — required read, edit, refresh, render, and
   review loop.
4. [`tool-behavior.md`](tool-behavior.md) — runtime behavior and transaction
   boundaries.
5. [`response-semantics.md`](response-semantics.md) — conflicts, diagnostics,
   and completion decisions.
6. [`api-usage.md`](api-usage.md) — loopback and browser-session requests.
7. [`circuit-style-knowledge.md`](circuit-style-knowledge.md) and
   [`knowledge/`](knowledge/README.md) — evidence-first circuit reading and
   on-demand style/pattern guidance.
8. [`examples.md`](examples.md) — checked, reproducible workflows.

The browser-authorized relay adds transport, session, and permission rules in
[`../specs/web-agent-session.md`](../specs/web-agent-session.md). It carries the
same Agent Circuit domain requests and does not redefine circuit semantics.

## Enforcement boundary

```text
API schemas and permissions
  define what an Agent may request

Schematic Edit Engine and model validators
  enforce hard electrical, revision, lock, and atomicity rules

derived diagnostics
  report measurable visual problems without moving objects

Agent guides
  describe preferred but non-mandatory layout judgment
```

When guidance and schemas differ, the schemas and Edit Engine validation win.
Explicit Junction semantics, Net consistency, and locked-object protection
never depend on an Agent following prose.
