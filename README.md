# Analog Canvas

Analog Canvas 是一款本地优先、感知电气连接关系的 Web 原理图编辑器。你可以绘制并组织层次化电路，导入结构化 SPICE，导出确定性的 SPICE/Spectre 网表和矢量 SVG/PDF，将选定作品发布到社区画廊，并让已授权的 Agent 通过同一套强类型编辑模型连接项目。

[浏览画廊](https://analog-canvas.tokenzhang.com/) ·
[打开编辑器](https://analog-canvas.tokenzhang.com/editor) ·
[项目文档](docs/README.md) ·
[GitHub 仓库](https://github.com/dude1wudv/analog-canvas)

## 主要特性

- **感知连接关系的编辑：** 放置器件、布线、区分交叉点与连接点、标记网络，并执行可撤销的多对象编辑，不会把绘图几何关系错误地当成电气连接关系。
- **可复用的层次结构：** 将每张原理图编写为一个 Cell，定义独立的 Cell Pin，放置可复用的层次化模块，并在父级与子 Cell 之间导航。
- **项目与数据交换：** 保存私有云项目，导入或导出标准 `.icproj.json`，导入结构化 `.cir`、`.sp` 和 `.spi` 文件，并导出确定性的结构化 SPICE 或 Spectre 网表。预览版编辑器还提供已保存的仿真源文件夹，以及固定的 ngspice/SKY130 环境，可运行符合要求的 OP、DC、AC、TRAN 和 Noise 分析；正式环境是否可用仍由版本发布策略控制。
- **可直接用于发布的输出：** Web 编辑器导出的 SVG 和 PDF 保持为矢量图形；PNG 以 3 倍光栅分辨率渲染。
- **社区发布：** 登录用户可以把选定电路发布到社区画廊，支持服务端预览图、标签、点赞、内容审核以及有界版本历史。发布是主动操作，不能代替备份。
- **Agent 集成：** 强类型 Snapshot 与事务 API 可通过固定版本的 stdio MCP 适配器、HTTP Agent Kit 及已发布的 OpenAPI 契约使用。参见 [Agent 集成指南](docs/agent/README.md)。

## 项目归属与隐私

明确执行 **文件 / 保存** 会原地更新一个私有云项目。本地 `.icproj.json` 文件是可移植的导入、导出与备份产物；浏览器恢复数据则是保存在当前站点下的崩溃保护副本。两者都不会与正式的云端保存混淆，社区画廊条目也始终是独立的公开发布内容。托管服务仅使用第一方访客统计，并遵循浏览器的“请勿跟踪”（Do Not Track）设置，不嵌入第三方分析器。

**检查并保存** 会按需运行 ERC 和视觉检查，在“问题”列表与画布上显示结果，并通过同一个云项目服务保存。检查结果不会阻止保存；继续编辑会使上次检查失效，但不会自动重新运行。文件 / 保存和 Ctrl+S 始终只执行保存。

## 快速开始

- **使用在线版本：** 浏览[社区画廊](https://analog-canvas.tokenzhang.com/)，或[新建电路](https://analog-canvas.tokenzhang.com/editor)。
- **学习编辑器：** 阅读[入门指南](docs/user/getting-started.md)、[原理图层次结构](docs/user/schematic-hierarchy.md)、[兼容性说明](docs/user/project-compatibility.md)和[故障排查](docs/user/troubleshooting.md)。
- **了解项目：** 查看[当前架构](docs/overall-product-plan.md)和[文档索引](docs/README.md)。
- **开发或贡献：** 阅读[工作规则](AGENTS.md)、[当前开发阅读清单](docs/README.md#contributor-reading-order)和[测试系统](docs/testing/README.md)。

## 本地运行

需要 Node.js 24 或更高版本，以及 pnpm 11.16.0 或更高版本。

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

打开命令行显示的本地地址并选择**新建电路**，也可以直接访问其 `/editor` 路径。通过元件库创建电路，或导入一个 `.cir`、`.sp`、`.spi` 入口文件及其本地 include 文件。

## 仓库内容

- `apps/editor/`：React/SVG 编辑器，以及画廊、账户、审核和统计页面。
- `apps/local-host/`：仅允许本机回环访问的可安装 PWA 正式版宿主。
- `apps/mcp-server/`：供已授权 Agent 会话使用的 stdio MCP 适配器软件包。
- `packages/model/`、`packages/project-protocol/` 和 `packages/edit-engine/`：当前持久化电路模型、有界文件兼容层和原子变更边界。
- [`packages/components/`](packages/components/README.md)：每个内置元件对应一个标准 JSON 文件，包含符号、电气规则和目录元数据；运行时软件包使用由其生成的投影数据。
- `packages/spice/`、`packages/devices/`、`packages/symbols/` 和 `packages/netlist/`：结构化 SPICE 导入、内置器件信息、符号语义及确定性的设计网表导出。
- `packages/exporters/` 和 `packages/render-svg/`：正式的 SVG、PNG 和 PDF 输出。
- `packages/agent-adapter/`、`packages/agent-client/` 和 `packages/agent-routing/`：共享的 Agent 契约、客户端和路由逻辑。
- `worker/`：用于静态托管、画廊、账户、第一方统计及 Agent 中继会话的 Cloudflare Worker 和 Durable Objects。
- `docs/`：当前架构、用户指南、规范性契约、ADR 和交付计划。

[Razavi 参考清单](fixtures/visual-reference/razavi-reference-v1/)是唯一的视觉标准。合并到 `main` 会部署预览版；只有在预览验收通过后，才能通过发布标签或明确指定提交的手动调度来提升为正式版。参见[部署说明](docs/deployment.md)了解发布与恢复契约。

## 许可证

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
