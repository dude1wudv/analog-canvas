# Analog Canvas 自托管

本文描述当前复刻 feature branch 的自托管结构和操作方式。它对应固定 Git
commit，独立于上游的 Cloudflare Wrangler 工作流，也不会自动同步或合并上游
更新。本页描述运行方式，功能验收由使用者手动完成。

## 访问和组件

目标入口是 `https://analog.sunmmyapi.xyz/editor`。公网 HTTPS 入口由 Caddy
终止 TLS，并反向代理到本机的 `127.0.0.1:8787`：

```caddyfile
analog.sunmmyapi.xyz {
    reverse_proxy 127.0.0.1:8787 {
        header_up CF-Connecting-IP {http.request.remote.host}
    }
}
```

Compose 栈由四个服务组成：

- `app` 运行原生 workerd 和现有 Worker 路由。它负责 `/api/*`、账号、编辑器
  会话、模拟请求和 `/source`；只监听回环地址，由外部 HTTPS 入口访问。
- `assets` 是 nginx 静态资源服务，只从 `apps/editor/dist` 提供 HTML、脚本、
  样式和其他前端资源。它与 `app` 通过内部 `frontend` 网络连接，公网不直接暴露。
- `simulator` 是带访问令牌的 ngspice gateway；它只接受 `app` 通过固定
  `SIMULATION_SERVICE` service binding 发来的 `/run` 和 `/cancel`。
- `executor` 是隔离的 ngspice 执行容器，只加入内部 `simulation` 网络，并由
  gateway 转发请求。`gateway` 和 `simulation` 网络都不对公网开放。

`app` 不需要开启任意私网 URL 的服务器端 fetch。模拟器地址和令牌在 workerd
配置中固定为 gateway service binding 与服务器 secret；gateway 验证令牌后在
隔离网络内访问 executor，令牌不进入执行容器。AI 识图请求则由浏览器直接发送到用户填写的 AI 接口，不经过
本站 Worker 或 simulator。

## 固定版本部署

服务器应拉取并校验指定的完整 commit SHA，再从该 SHA 构建。不要用移动分支或
`latest` 作为发布输入：

```sh
cd /path/to/analog-canvas
git fetch --no-tags origin <FULL_COMMIT_SHA>
git checkout --detach <FULL_COMMIT_SHA>
test "$(git rev-parse HEAD)" = "<FULL_COMMIT_SHA>"
ANALOG_STATE_DIR=/opt/analog-canvas \
  ./containers/self-host/deploy.sh "<FULL_COMMIT_SHA>"
```

`deploy.sh` 会在服务器上创建持久目录，初始化 secret，并构建 `app`、`assets`
和 `executor` 镜像；构建阶段先打包上游 ngspice harness，并从构建容器提取到 executor 构建上下文。构建工具链仍在容器内，不依赖主机 Node 版本。随后用同一个 revision 启动 Compose 栈。它只执行
`docker compose up -d --no-build`，不会执行 `down`、删除 volume、重置数据库或
改动共享网络。回滚时指定之前已经构建过的固定 SHA，并保留同一个状态目录。

也可以手动复现构建阶段：

```sh
docker build -f containers/self-host/Dockerfile \
  --build-arg REVISION="$(git rev-parse HEAD)" \
  --target runtime \
  -t analog-canvas:"$(git rev-parse HEAD)" .
```

构建要求 Node.js 24、pnpm 11.16.0，并使用锁文件安装依赖。Dockerfile 会把
前端构建结果放入 nginx 镜像，把 Worker bundle 和固定版本的 workerd 放入
runtime 镜像。runtime 以非 root 用户运行、只读挂载应用和 secrets，并限制
进程数、CPU、内存和临时目录。

## workerd 数据和备份

runtime 通过原生 workerd 的实验性 `localDisk` API 保存 Durable Object 数据：

- `compatibilityDate` 固定为 `2026-08-11`，启动命令使用 `workerd serve
--experimental`；
- Analytics、AgentSession、Gallery、Auth 四个 Durable Object namespace 各自
  使用固定的 `analog-hk-*-v1` key，并开启 SQLite；
- `durableObjectStorage = (localDisk = "data")`，对应主机上的
  `/opt/analog-canvas/data`；Compose 当前只运行一个 `app` 副本；
- 这是单副本本地盘，代码没有多副本同步或自动备份。升级或迁移前应停止
  `app`，对整个 `data` 目录做一致性备份，并保留与之匹配的 release 记录。

不要在发布脚本中删除 `/opt/analog-canvas/data`，也不要使用 `docker compose
down -v`。executor 的 `run-root` 是模拟执行工作目录，和 Worker 的 SQLite
数据分开；需要回滚时两者都不应被无意删除。

## 本地账号和服务器 secret

自托管配置默认开启本地账号，管理员用户名为 `sun`。首次初始化时
`containers/self-host/init-secrets.mjs` 在服务器的
`/opt/analog-canvas/secrets/` 创建并设置权限：

| 文件                  | 用途                                            |
| --------------------- | ----------------------------------------------- |
| `admin-password`      | 管理员 `sun` 的初始明文密码，仅留在服务器文件中 |
| `admin-password-hash` | 传给 Auth Durable Object 的版本化 scrypt hash   |
| `simulation-token`    | app 与 ngspice gateway 之间的 bearer token      |
| `analytics-key`       | analytics 管理接口的 key                        |
| `runtime.env`         | gateway 读取的 `SIMULATION_ACCESS_TOKEN`        |

这些文件由脚本以 `0600` 创建，目录为 `0700`；runtime 只读挂载 secrets。密码
原文不进入 Git、镜像、项目文件、浏览器存储、Worker 响应或日志。workerd 只
嵌入 `admin-password-hash`，不会读取或返回 `admin-password`。

管理员 hash 使用固定版本的 `scrypt N=32768, r=8, p=3` 格式。已有
`local_credentials` 记录时，Auth Durable Object 的 bootstrap 不覆盖已有
`password_hash`；重新部署或重启不会重置已有账户密码。用户注册和登录通过
`/api/auth/local/register`、`/api/auth/local/login` 完成，用户名为小写
`[a-z0-9_]{3,32}`，密码长度为 12–128 字符。账号表与凭据表分离，local 用户的
`email` 为 `null`，登录返回现有 HttpOnly session cookie。系统同时按用户名和
来源 IP 限制尝试次数。

初始密码应由服务器管理员通过受控方式读取并在首次登录后按运维流程保管；不要
把它复制到仓库、Issue、聊天记录或客户端配置中。

## 图片识别到结构 SPICE

在编辑器选择「文件 → 从电路图识别 SPICE…」：

1. 选择 PNG、JPEG 或 WebP，文件上限为 10 MiB，解码后分辨率上限为 4000 万像素。
2. 在「AI 接口设置」添加一个或多个 HTTPS OpenAI-compatible 配置，并选择
   Chat Completions 或 Responses API。每组配置可包含多个模型，页面最多保留
   20 组配置。
3. 每组配置可选择 `low`、`medium`、`high` 或 `max` 思考强度。Responses API
   使用 `reasoning.effort`，Chat Completions 使用 `reasoning_effort`，均原样传入。
4. API Key、接口地址、协议、模型列表、思考强度和识别草稿只保留在当前页面的
   内存中；不会写入 `localStorage`、session storage、项目文件或本站服务端。
   刷新或离开页面后清除。
5. 可先用「测试连通性」向选中模型发送一张微小图片；该请求可能产生少量费用，
   目标接口必须支持浏览器 CORS、对应协议的图片 data URL 和非流式响应。
6. 选择图片后点击「识别电路图」。原图直接发送到所选接口，最多等待十分钟，
   可以取消。识别结果必须是 JSON，包含 `spice` 和 `uncertainties`；接口拒绝、
   截断、超限、无效 JSON 或带额外 prose 的结果都会被拒绝。
7. 编辑器先按结构 SPICE 规则检查 JSON、允许的记录和现有 Import SPICE 结果。
   仅接受 `.model`、`.subckt`、`.ends`、`.global`、`.param`、`.end` 等结构
   指令；`.include`、`.lib`、控制块、仿真分析和行为源会被拒绝。检查结果会列出
   器件引脚到网络的映射以及 AI 报告的不确定项。
8. 对照原图逐项核对连接、极性、引脚顺序、器件值和不确定项，勾选确认后点击
   「通过 Import SPICE 建立工程」。也可先下载 `.cir`，再用原有 Import SPICE
   流程处理。

第一版的目标是保留电气连接，不恢复图片版图。识图结果不携带图片版图的 placement 和
route；当前 Import SPICE 会为器件建立初始画布位置，之后使用现有放置和布线操作调整布局。可识别的常见记录
包括 R/C/L、独立 V/I、二极管 D、三端 Q、四端 M，以及带明确 pin order 的 X
子电路或外部块；外部块的 P1、P2 等按 SPICE 源文件顺序生成。
已知器件族的缺省模型卡可以作为拓扑占位，但不代表具有可仿真的模型；完全未知
的模型或符号可能被 importer 拒绝，并应留在不确定项中修正。

结构检查成功只表示网表能通过现有 importer 并生成工程，不证明 AI 读图正确，
也不证明该电路可仿真。最终连接和模型仍由用户手动核对。

## 入口检查和运维边界

修改 Caddy 配置后先校验再 reload：

```sh
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

`GET /health` 只报告 app 进程的静态存活；它不代表 AI 接口、账号、ngspice
executor 或识别质量。`/source` 指向当前镜像记录的固定 revision，方便核对源代码。

本栈提供独立的本地账号、云项目、公共画廊、Agent 中继和 operator-host 仿真后端，
不与上游 Cloudflare 站点共享账户或数据。编辑结果也可用 `.icproj.json` 导出备份；
浏览器恢复数据只用于崩溃恢复。当前这条自托管 feature branch 与上游 Cloudflare 工作流分开维护，用户应
在生产切换后手动验收域名、账号、图片识别、SPICE 导入和模拟链路。
