import type { EditorTool } from "../../interaction/interaction-state";
import { ToolIcon } from "./tool-icon";
import {
  ArrowStylePicker,
  ArrowStyleIcon,
} from "../drafting/arrow-style-picker";
import {
  DEFAULT_ARROW_PRESET,
  type ArrowPreset,
} from "../drafting/arrow-presets";

interface ToolbarCommand {
  enabled: boolean;
  execute: () => void;
}

export interface DrawingToolbarProps {
  leftPanelMode: "examples" | "library";
  libraryPanelOpen: boolean;
  leftPanelsDisabled?: boolean;
  tool: EditorTool;
  arrowPreset?: ArrowPreset;
  onArrowPresetChange?: (preset: ArrowPreset) => void;
  documentSettingsOpen: boolean;
  undo: ToolbarCommand;
  redo: ToolbarCommand;
  simulation?: { open: boolean; onToggle: () => void };
  onToggleExamples: () => void;
  onToggleLibrary: () => void;
  onInsert: () => void;
  onActivateTool: (tool: EditorTool) => void;
  onAddText: () => void;
  onOpenDocumentSettings: () => void;
}

export function DrawingToolbar({
  leftPanelMode,
  libraryPanelOpen,
  leftPanelsDisabled = false,
  tool,
  arrowPreset = DEFAULT_ARROW_PRESET,
  onArrowPresetChange,
  documentSettingsOpen,
  undo,
  redo,
  onToggleExamples,
  onToggleLibrary,
  onInsert,
  onActivateTool,
  onAddText,
  onOpenDocumentSettings,
  simulation,
}: DrawingToolbarProps) {
  const examplesOpen = leftPanelMode === "examples" && libraryPanelOpen;
  const libraryOpen = leftPanelMode === "library" && libraryPanelOpen;

  return (
    <div
      className="toolbar-row draw-toolbar"
      aria-label="绘图工具"
      data-testid="draw-toolbar"
    >
      <button
        type="button"
        className="draw-tool examples-toggle"
        title={
          examplesOpen ? "Hide the circuit gallery" : "Show the circuit gallery"
        }
        aria-pressed={examplesOpen}
        aria-controls="examples-panel"
        aria-expanded={examplesOpen}
        data-testid="examples-toggle"
        disabled={leftPanelsDisabled}
        onClick={onToggleExamples}
      >
        <ToolIcon name="examples" />
        <span>画廊</span>
      </button>
      <button
        type="button"
        className="draw-tool"
        title={
          libraryPanelOpen ? "Hide component library" : "Show component library"
        }
        aria-pressed={libraryOpen}
        aria-controls="shapes-library-panel"
        aria-expanded={libraryOpen}
        data-testid="library-toggle"
        disabled={leftPanelsDisabled}
        onClick={onToggleLibrary}
      >
        <ToolIcon name="library" />
        <span>元件库</span>
      </button>
      <span className="draw-toolbar-divider" aria-hidden="true" />
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-undo"
        title="撤销（Ctrl+Z）"
        onClick={undo.execute}
        disabled={!undo.enabled}
      >
        <ToolIcon name="undo" />
        <span>撤销</span>
      </button>
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-redo"
        title="重做（Ctrl+Shift+Z）"
        onClick={redo.execute}
        disabled={!redo.enabled}
      >
        <ToolIcon name="redo" />
        <span>重做</span>
      </button>
      <span className="draw-toolbar-divider" aria-hidden="true" />
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-insert"
        title="插入元件（I）"
        onClick={onInsert}
      >
        <ToolIcon name="insert" />
        <span>插入</span>
      </button>
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-wire"
        aria-pressed={tool === "wire"}
        title="导线（W）"
        onClick={() => onActivateTool("wire")}
      >
        <ToolIcon name="wire" />
        <span>导线</span>
      </button>
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-text"
        aria-label="文本"
        title="文本（T）"
        onClick={onAddText}
      >
        <ToolIcon name="text" />
        <span>文本</span>
      </button>
      <span className="toolbar-divider" aria-hidden="true" />
      <div className="arrow-split-tool">
        <button
          type="button"
          className="draw-tool"
          data-testid="draw-tool-arrow"
          aria-pressed={tool === "arrow"}
          title="箭头"
          onClick={() => onActivateTool("arrow")}
        >
          <ArrowStyleIcon preset={arrowPreset} />
          <span>箭头</span>
        </button>
        <ArrowStylePicker
          label="New arrow style"
          value={arrowPreset}
          onChange={(preset) => {
            onActivateTool("arrow");
            onArrowPresetChange?.(preset);
          }}
        />
      </div>
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-line"
        aria-pressed={tool === "construction-line"}
        title="辅助线（K）"
        onClick={() => onActivateTool("construction-line")}
      >
        <ToolIcon name="line" />
        <span>直线</span>
      </button>
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-rectangle"
        aria-pressed={tool === "rectangle"}
        title="矩形（R）"
        onClick={() => onActivateTool("rectangle")}
      >
        <ToolIcon name="rectangle" />
        <span>矩形</span>
      </button>
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-circle"
        aria-pressed={tool === "circle"}
        title="圆形"
        onClick={() => onActivateTool("circle")}
      >
        <ToolIcon name="circle" />
        <span>圆形</span>
      </button>
      <span className="toolbar-divider" aria-hidden="true" />
      <button
        type="button"
        className="draw-tool"
        data-testid="draw-tool-document-style"
        aria-pressed={documentSettingsOpen}
        title="文档设置"
        onClick={onOpenDocumentSettings}
      >
        <ToolIcon name="style" />
        <span>样式</span>
      </button>
      {simulation ? (
        <button
          type="button"
          className="draw-tool"
          data-testid="digital-simulation-toggle"
          aria-pressed={simulation.open}
          title="数字仿真"
          onClick={simulation.onToggle}
        >
          <ToolIcon name="simulation" />
          <span>仿真</span>
        </button>
      ) : null}
    </div>
  );
}
