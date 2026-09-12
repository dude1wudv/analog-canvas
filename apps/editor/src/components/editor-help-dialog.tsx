import type { RefObject } from "react";

import editorPackage from "../../package.json";

const REPOSITORY_URL = "https://github.com/dude1wudv/analog-canvas";
const CHANGE_LOG_URL = `${REPOSITORY_URL}/commits/main`;
const OWNER_URL = "https://www.tokenzhang.com";

const SHORTCUT_GROUPS = [
  {
    id: "create",
    title: "创建",
    shortcuts: [
      { keys: ["I"], action: "插入元件" },
      { keys: ["P"], action: "放置 Cell Pin" },
      { keys: ["W"], action: "绘制导线" },
      { keys: ["T"], action: "添加文本" },
    ],
  },
  {
    id: "edit",
    title: "编辑",
    shortcuts: [
      { keys: ["U"], action: "撤销上次编辑" },
      { keys: ["Shift", "U"], action: "重做上次编辑" },
      { keys: ["C"], action: "复制并放置所选对象" },
      { keys: ["R"], action: "旋转所选对象 / 空闲时绘制矩形" },
      { keys: ["Shift", "R"], action: "左右镜像" },
      { keys: ["Ctrl", "R"], action: "上下镜像" },
    ],
  },
  {
    id: "workspace",
    title: "工作区",
    shortcuts: [
      { keys: ["Q"], action: "显示或隐藏属性面板" },
      { keys: ["F"], action: "缩放至适合窗口" },
    ],
  },
] as const;

function ShortcutChord({ keys }: { keys: readonly string[] }) {
  return (
    <span className="help-shortcut-chord" aria-label={keys.join(" 加 ")}>
      {keys.map((key, index) => (
        <span key={key} className="help-shortcut-key-part">
          {index > 0 ? (
            <span className="help-shortcut-plus" aria-hidden="true">
              +
            </span>
          ) : null}
          <kbd>{key}</kbd>
        </span>
      ))}
    </span>
  );
}

export interface EditorHelpDialogProps {
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onClose(): void;
}

export function EditorHelpDialog({
  closeButtonRef,
  onClose,
}: EditorHelpDialogProps) {
  return (
    <div
      className="help-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="help-dialog"
        id="editor-help-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-title"
      >
        <header className="help-dialog-header">
          <div>
            <p className="help-kicker">Analog Canvas</p>
            <h2 id="help-title">帮助</h2>
          </div>
          <button
            type="button"
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="关闭帮助"
          >
            关闭
          </button>
        </header>
        <div className="help-dialog-content">
          <section id="help-introduction" className="help-introduction">
            <p className="help-section-label">简介</p>
            <p>
              Analog Canvas 是一款基于浏览器的原理图编辑器。导入 SPICE
              或打开项目，在画布上编辑电路，然后导出可继续编辑的项目文件或图纸。
            </p>
          </section>
          <nav className="help-index" aria-label="帮助章节">
            <a href="#help-introduction">简介</a>
            <a href="#help-handbook">使用手册</a>
            <a href="#help-shortcuts">快捷键</a>
            <a href="#help-data">项目数据</a>
          </nav>
          <section id="help-handbook" className="help-handbook">
            <p className="help-section-label">使用手册</p>
            <h3>新建、打开与保存</h3>
            <p>
              从<strong>文件</strong>菜单打开私有云项目，或使用
              <strong>导入项目文件</strong>和<strong>导入 SPICE</strong>
              读取可移植文件。使用<strong>文件 / 保存</strong>更新正式云项目；
              <strong>导出项目文件</strong>
              会生成可移植的本地副本。只有浏览器恢复机制
              无法保护当前工作时，才会出现直接下载备份的选项。图纸可导出为
              SVG、PNG 和
              PDF。为保护未保存的工作，浏览器原生刷新快捷键会被拦截；需要重新加载时，
              请使用<strong>文件 / 刷新应用</strong>
              ，它会保存并恢复当前恢复快照。
            </p>
            <h3>放置、选择与连接</h3>
            <p>
              在左侧元件库中选择符号，或从<strong>绘制</strong>中选择绘图工具，
              然后点击画布放置或绘制。窄屏下元件库默认折叠，可用左侧
              <strong>元件库</strong>
              按钮打开单列列表。选中对象会在右侧打开属性面板；
              窄屏下它会覆盖画布并关闭元件库。选择导线（或按 <kbd>W</kbd>
              ），点击端子 开始布线，继续点击添加折点，再按 <kbd>
                Enter
              </kbd>{" "}
              完成。
              <kbd>删除</kbd> 或 <kbd>Backspace</kbd>{" "}
              可删除所选对象；布线时则删除 最近一个折点。
            </p>
            <p>
              “编辑”菜单提供三种可撤销的 Cell 操作：<strong>清除图形</strong>
              会移除 Route 与绘图几何对象，但保留逻辑对象；
              <strong>重置 Cell 放置</strong>
              会将实例放回待放置区并移除 Route
              几何对象，同时保留器件、网络和端口；
              <strong>重置 Cell 内容</strong>
              会移除接口以外的电气内容，同时保留正式 Cell
              接口。每个命令都会预览影响，并可通过“撤销”恢复。
            </p>
            <h3>层次化 Cell</h3>
            <p>
              使用<strong>管理 Cell…</strong>创建可复用的 Cell，再通过
              <strong>放置 Cell</strong>将其实例添加到画布。选中层次化模块后按
              <kbd>E</kbd> 或双击即可进入。使用<strong>返回上级</strong>或
              <kbd>Shift+E</kbd> 返回父 Cell。
            </p>
            <h3>视图与绘图工具</h3>
            <p>
              指针位于画布上时，可用鼠标滚轮缩放、中键拖动平移；按 <kbd>F</kbd>
              让电路适合窗口。“绘制”中还包含导线、文本、箭头、辅助线和矩形。未选中
              可旋转对象时，按 <kbd>R</kbd>{" "}
              开始绘制矩形；选中元件或图形时则顺时针旋转。
              <kbd>Shift+R</kbd> 左右镜像，<kbd>Ctrl+R</kbd> 上下镜像。
              <kbd>M</kbd> 让当前所选对象跟随指针，点击完成放置，按{" "}
              <kbd>Esc</kbd>
              取消。<kbd>C</kbd> 开始复制并跟随鼠标，点击放置，按 <kbd>Esc</kbd>{" "}
              取消。
            </p>
          </section>
          <section id="help-shortcuts" className="help-shortcuts">
            <h3>键盘快捷键</h3>
            <div className="help-shortcut-grid">
              {SHORTCUT_GROUPS.map((group) => (
                <section
                  key={group.id}
                  className={`help-shortcut-group help-shortcut-group-${group.id}`}
                  aria-labelledby={`help-shortcut-group-${group.id}`}
                >
                  <h4 id={`help-shortcut-group-${group.id}`}>{group.title}</h4>
                  <ul>
                    {group.shortcuts.map((shortcut) => (
                      <li
                        key={`${group.id}-${shortcut.keys.join("-")}`}
                        className="help-shortcut-item"
                      >
                        <span className="help-shortcut-action">
                          {shortcut.action}
                        </span>
                        <ShortcutChord keys={shortcut.keys} />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="help-shortcut-note">
              在文本框中输入时，快捷键会暂停响应。
            </p>
          </section>
          <section id="help-data" className="help-data-note">
            <h3>项目数据与恢复</h3>
            <p>
              本编辑器运行在浏览器中。每次接受编辑后，它都会在浏览器存储中保留当前
              项目的安全副本：最多两份近期工作副本，每份包含当前与上一代数据（每代
              最多 4 MB，总计最多 12 MB）。使用
              <strong>文件 / 恢复本地工作…</strong>
              浏览、恢复、下载或删除这些副本。它们不是正式云项目，清除浏览器数据后
              可能丢失；若在编辑后的极短时间内刷新，也可能遗漏最后一次更改。“保存”
              会更新私有云项目，导出不会删除安全副本。从画廊返回时，本标签页会重新打开
              上一个活动云项目；若存在更新的本地恢复数据，则会先请你选择如何处理。
            </p>
          </section>
          <section className="help-about">
            <h3>关于 Analog Canvas</h3>
            <p>
              <strong>Analog Canvas</strong> 是一款用于可编辑电路设计的本地优先
              原理图编辑器。
            </p>
            <p>
              版本 <strong>{editorPackage.version}</strong>
            </p>
            <nav
              className="help-resource-links"
              aria-label="Analog Canvas 资源"
            >
              <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
                代码仓库
              </a>
              <a href={CHANGE_LOG_URL} target="_blank" rel="noreferrer">
                更新记录
              </a>
              <a href={OWNER_URL} target="_blank" rel="noreferrer">
                所有者
              </a>
            </nav>
          </section>
        </div>
      </section>
    </div>
  );
}
