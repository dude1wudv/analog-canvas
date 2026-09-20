# Analog Canvas

Analog Canvas 是一款本地优先、感知电气连接关系的 Web 原理图编辑器。你可以绘制并组织层次化电路，导入结构化 SPICE，导出确定性的 SPICE/Spectre 网表和矢量 SVG/PDF，将选定作品发布到社区画廊，并让已授权的 Agent 通过同一套强类型编辑模型连接项目。

[浏览画廊](https://analog.sunmmyapi.xyz/) ·
[打开编辑器](https://analog.sunmmyapi.xyz/editor) ·
[项目文档](docs/README.md) ·
[GitHub 仓库](https://github.com/dude1wudv/analog-canvas)

## 主要特性

- **Connectivity-aware editing:** place devices, route wires, distinguish
  Crossings from Junctions, label Nets, and make undoable multi-object edits
  deriving physical networks from completed wire edits while keeping logical
  labels and unrouted import intent explicit.
- **Reusable hierarchy:** author each schematic as a Cell, define independent
  Cell Pins, place reusable hierarchical blocks, and navigate between callers
  and child Cells.
- **Projects and interchange:** save a private Cloud Project, import/export
  canonical `.icproj.json`, import structural `.cir`, `.sp`, `.spi`, and `.scs` files, and export
  deterministic structural SPICE or Spectre. The hosted editor also provides
  saved simulation source folders and a fixed ngspice/SKY130 environment for qualified
  OP, DC, AC, TRAN, and Noise runs.
- **Publication-ready output:** the web editor's SVG and PDF exports remain
  vector graphics; PNG is rendered at 3× raster scale.
- **Community publishing:** signed-in users can publish selected circuits with
  server-rendered previews, tags, likes, moderation, and bounded version
  history. Publishing is deliberate and is not a backup mechanism.
- **Agent integration:** the typed Snapshot and transaction API is available
  through a version-pinned stdio MCP adapter, an HTTP Agent Kit, and the
  published OpenAPI contract. See the [Agent integration guide](docs/agent/README.md).

## 项目归属与隐私

明确执行 **文件 / 保存** 会原地更新一个私有云项目。本地 `.icproj.json` 文件是可移植的导入、导出与备份产物；浏览器恢复数据则是保存在当前站点下的崩溃保护副本。两者都不会与正式的云端保存混淆，社区画廊条目也始终是独立的公开发布内容。托管服务仅使用第一方访客统计，并遵循浏览器的“请勿跟踪”（Do Not Track）设置，不嵌入第三方分析器。

**检查并保存** 会按需运行 ERC 和视觉检查，在“问题”列表与画布上显示结果，并通过同一个云项目服务保存。检查结果不会阻止保存；继续编辑会使上次检查失效，但不会自动重新运行。文件 / 保存和 Ctrl+S 始终只执行保存。

## 快速开始

- **使用在线版本：** 浏览[社区画廊](https://analog.sunmmyapi.xyz/)，或[新建电路](https://analog.sunmmyapi.xyz/editor)。
- **学习编辑器：** 阅读[入门指南](docs/user/getting-started.md)、[原理图层次结构](docs/user/schematic-hierarchy.md)、[兼容性说明](docs/user/project-compatibility.md)和[故障排查](docs/user/troubleshooting.md)。
- **了解项目：** 查看[当前架构](docs/overall-product-plan.md)和[文档索引](docs/README.md)。
- **开发或贡献：** 阅读[工作规则](AGENTS.md)、[当前开发阅读清单](docs/README.md#contributor-reading-order)和[测试系统](docs/testing/README.md)。

## 本地运行

需要 Node.js 24 或更高版本，以及 pnpm 11.16.0 或更高版本。

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

Run `pnpm build` once after installing, and again after pulling package
changes: the development server's Vite configuration loads some workspace
packages from their built `dist/` output.

Open the displayed loopback URL and choose **New Circuit**, or open its
`/editor` route directly. Create a circuit from the component palette, or
import one `.cir`, `.sp`, `.spi`, or `.scs` entry together with its local include
files.

Click **Agent** to open a connection message, then copy it into your Agent
chat. The development server starts the local Agent relay on first use;
no separate Worker command or cloud account is needed. Keep the editor open
while the Agent works. Sessions expire after 30 minutes without Agent operations
or manual edits; continued activity renews them. Stopping the development server
also ends local sessions;
after restarting it, create a new connection. Cloud account, Gallery, and
hosted simulation services are not started by this local relay.

Development follows three stages: iterate locally with focused checks and
local commits; deliver a pull request, which deploys directly to Production
unless it carries the `preview` label, in which case it goes to Preview; then
promote Preview-accepted work to Production when that release is authorized.
Each local edit ends at the local stage by default. See the
[working rules](AGENTS.md#three-stage-development-and-delivery)
and [delivery cadence](docs/deployment.md#development-and-publication-cadence).

## What the repository contains

- `apps/editor/`: React/SVG editor plus the Gallery, account, moderation, and
  project surfaces.
- `apps/editor/analytics/`: the complete first-party analytics module: page,
  styles, browser reporting, HTTP routes, map data, and Durable Object backend.
- `apps/local-host/`: loopback-only production host for the installable PWA.
- `apps/mcp-server/`: packaged stdio MCP adapter for authorized Agent sessions.
- `packages/model/`, `packages/project-protocol/`, and `packages/edit-engine/`:
  current persisted circuit model, bounded file compatibility, and atomic
  mutation boundary.
- `packages/derived/`: read-only connectivity, diagnostic, and geometry
  projections over the persisted model.
- [`packages/components/`](packages/components/README.md): one canonical JSON
  file per built-in component, containing its symbol, electrical rules and
  catalog metadata; runtime packages consume generated projections.
- `packages/spice/`, `packages/devices/`, `packages/symbols/`, and
  `packages/netlist/`: structural SPICE import, built-in device facts, symbol
  semantics, and deterministic design-netlist export.
- `packages/exporters/` and `packages/render-svg/`: formal SVG, PNG, and PDF
  output.
- `packages/math-typesetting/`: bounded LaTeX formula typesetting for rich-text
  annotations.
- `packages/simulation-service/` and `packages/spice-run/`: shared simulation
  preparation, run lifecycle, and artifacts, plus simulator request and result
  contracts.
- `packages/timing-simulation/`: deterministic digital timing simulation; its
  experimental editor UI is hidden in production builds.
- `packages/platform-node/`: Node filesystem storage and recovery adapters with
  no current in-repository consumer.
- `packages/agent-adapter/`, `packages/agent-client/`, and
  `packages/agent-routing/`: shared Agent contract, client, and routing logic.
- `worker/`: Cloudflare Worker host and Durable Objects for static hosting,
  Gallery, accounts, Cloud Projects, simulation, and Agent relay sessions.
- `containers/`: simulator images, gateways, and operator-host topologies for
  ngspice and the Preview VACASK candidate.
- `netlists/`: one circuit per directory for the SPICE import corpus,
  simulation examples and qualification, and Agent layout evaluation.
- `fixtures/`: Project, SPICE, rawfile, export, Agent API, and visual-reference
  test inputs and goldens.
- `scripts/` and `config/`: build, generation, validation-gate, release, and
  deployment tooling, with the gate catalog and pinned MCP and VACASK Preview
  declarations.
- `tools/`, `skills/`, and `references/`: manual Razavi calibration and PDF
  extraction tools, the repository-local `circuit-layout` Agent Skill, and the
  pinned external research-source manifest.
- `docs/`: current architecture, user guides, normative contracts, ADRs, and
  delivery plans.

The [Razavi reference manifest](fixtures/visual-reference/razavi-reference-v1/)
is the sole visual authority. A merge to `main` deploys to Production, or to
Preview when its pull request is labeled `preview`; Preview-accepted work is
promoted with a release tag or explicit dispatch.
See [deployment](docs/deployment.md) for the release and recovery contract.

## Netlist conversion

`POST /api/netlist/convert` accepts `{ "text": "...", "source": "spice", "target": "spectre" }`
and returns translated text or line-specific diagnostics. The Worker and local
Vite server expose the same pure converter; SCS import uses it locally too.
No Python daemon, simulator or account is required. The structural subset adapts
[netlist-crawler](https://github.com/Arcadia-1/netlist-crawler) under its MIT license.
See the [conversion contract](docs/specs/netlist-conversion.md) for supported
syntax and the [attribution](packages/spice/third-party/netlist-crawler/README.md).

## License

版权所有 © 2026 Zengchun Chen、Zhishuai Zhang。

除非另有说明，Analog Canvas 仅按 [GNU Affero General Public License v3.0](LICENSE.md)（`AGPL-3.0-only`）授权。经修改的版本若被分发或用于远程网络交互，必须按相同许可证提供其对应源代码。第三方依赖、参考资料和资源仍受其各自的版权与许可证条款约束。

## 引用

若在研究、教学或其他出版物中使用 Analog Canvas，请引用：

> Zengchun Chen and Zhishuai Zhang. _Analog Canvas_. 2026.
>
> 在线地址：https://analog-canvas.tokenzhang.com/
>
> 源代码：https://github.com/dude1wudv/analog-canvas

```bibtex
@software{chen2026analogcanvas,
  author = {Chen, Zengchun and Zhang, Zhishuai},
  title = {Analog Canvas},
  year = {2026},
  url = {https://analog-canvas.tokenzhang.com/},
  note = {Source code: https://github.com/dude1wudv/analog-canvas}
}
```
