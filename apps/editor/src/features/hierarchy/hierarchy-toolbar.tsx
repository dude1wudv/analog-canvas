import type { SchematicDocument } from "@icm/model";

export interface HierarchyToolbarProps {
  documents: readonly SchematicDocument[];
  activeDocumentId: string;
  topDocumentId: string;
  navigationDepth: number;
  canEnter: boolean;
  onTop: () => void;
  onSelectDocument: (documentId: string) => void;
  onEnter: () => void;
  onManageCells: () => void;
  onPlaceCell: () => void;
}

export function HierarchyToolbar({
  documents,
  activeDocumentId,
  topDocumentId,
  navigationDepth,
  canEnter,
  onTop,
  onSelectDocument,
  onEnter,
  onManageCells,
  onPlaceCell,
}: HierarchyToolbarProps) {
  if (documents.length <= 1 && navigationDepth === 0 && !canEnter) return null;

  return (
    <div className="toolbar-row" aria-label="文档层次结构">
      <div
        className="document-nav"
        aria-label="Cell 导航"
        data-testid="cell-navigation"
      >
        <button
          type="button"
          onClick={onTop}
          disabled={activeDocumentId === topDocumentId}
          title="返回顶层 Cell"
        >
          顶层
        </button>
        <select
          aria-label="Cell"
          data-testid="document-selector"
          value={activeDocumentId}
          onChange={(event) => onSelectDocument(event.currentTarget.value)}
        >
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.id === topDocumentId
                ? `${document.name}（顶层）`
                : document.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onEnter}
          disabled={!canEnter}
          title="进入所选 Cell（E）"
        >
          进入 Cell
        </button>
        <div className="cell-command-row" data-testid="cell-command-menu">
          <button type="button" onClick={onManageCells}>
            管理 Cell…
          </button>
          <button
            type="button"
            onClick={onPlaceCell}
            disabled={documents.length < 2}
          >
            放置 Cell
          </button>
        </div>
      </div>
    </div>
  );
}
