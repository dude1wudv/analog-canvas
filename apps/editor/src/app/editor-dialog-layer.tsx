import { Suspense, type ComponentProps } from "react";

import type { AgentFileCandidateSummary } from "@icm/agent-adapter";

import { ChunkLoadBanner } from "../components/chunk-load-fallback";
import {
  RecoveryAvailableBanner,
  RecoveryFailureBanner,
} from "../components/recovery-banners";
import {
  LazyCellManagerDialog,
  LazyConnectAgentPanel,
  LazyInsertComponentDialog,
  LazyNetlistPreflightDialog,
  LazyProjectSearchDialog,
  LazyPublishGalleryDialog,
  LazyRecentRecoveryDialog,
  LazyReplaceGuardDialog,
  LazyVersionHistoryDialog,
} from "./lazy-editor-dialogs";

export interface EditorDialogLayerProps {
  chunkLoadFailure: ComponentProps<typeof ChunkLoadBanner> | null;
  recoveryFailure: ComponentProps<typeof RecoveryFailureBanner> | null;
  recoveryAvailable: ComponentProps<typeof RecoveryAvailableBanner> | null;
  recentRecovery: ComponentProps<typeof LazyRecentRecoveryDialog> | null;
  replaceGuard: ComponentProps<typeof LazyReplaceGuardDialog> | null;
  search: ComponentProps<typeof LazyProjectSearchDialog> | null;
  insertComponent: ComponentProps<typeof LazyInsertComponentDialog> | null;
  cellManager: ComponentProps<typeof LazyCellManagerDialog> | null;
  netlistPreflight: ComponentProps<typeof LazyNetlistPreflightDialog> | null;
  publishGallery: ComponentProps<typeof LazyPublishGalleryDialog> | null;
  versionHistory: ComponentProps<typeof LazyVersionHistoryDialog> | null;
  agentConnection: ComponentProps<typeof LazyConnectAgentPanel> | null;
  agentFileApproval: {
    candidate: AgentFileCandidateSummary;
    onReject: () => void;
    onApprove: () => void;
  } | null;
}

/** All modal/overlay UI kept outside the persistent editor workspace. */
export function EditorDialogLayer({
  chunkLoadFailure,
  recoveryFailure,
  recoveryAvailable,
  recentRecovery,
  replaceGuard,
  search,
  insertComponent,
  cellManager,
  netlistPreflight,
  publishGallery,
  versionHistory,
  agentConnection,
  agentFileApproval,
}: EditorDialogLayerProps) {
  return (
    <>
      <Suspense fallback={null}>
        {chunkLoadFailure ? <ChunkLoadBanner {...chunkLoadFailure} /> : null}
        {recoveryFailure ? (
          <RecoveryFailureBanner {...recoveryFailure} />
        ) : null}
        {recoveryAvailable ? (
          <RecoveryAvailableBanner {...recoveryAvailable} />
        ) : null}
        {recentRecovery ? (
          <LazyRecentRecoveryDialog {...recentRecovery} />
        ) : null}
        {replaceGuard ? <LazyReplaceGuardDialog {...replaceGuard} /> : null}
        {search ? <LazyProjectSearchDialog {...search} /> : null}
        {insertComponent ? (
          <LazyInsertComponentDialog {...insertComponent} />
        ) : null}
        {cellManager ? <LazyCellManagerDialog {...cellManager} /> : null}
        {netlistPreflight ? (
          <LazyNetlistPreflightDialog {...netlistPreflight} />
        ) : null}
        {publishGallery ? (
          <LazyPublishGalleryDialog {...publishGallery} />
        ) : null}
        {versionHistory ? (
          <LazyVersionHistoryDialog {...versionHistory} />
        ) : null}
        {agentConnection ? (
          <LazyConnectAgentPanel {...agentConnection} />
        ) : null}
      </Suspense>
      {agentFileApproval ? (
        <div className="agent-panel" data-testid="agent-file-approval">
          <section
            className="agent-dialog"
            role="dialog"
            aria-label="批准 Agent 文件导入"
          >
            <div className="agent-panel-header">
              <h2>批准 Agent 文件导入</h2>
            </div>
            <p>
              Agent 已准备好一个 {agentFileApproval.candidate.kind}{" "}
              候选文件，尚未修改此项目。替换项目将结束当前 Agent 会话。
            </p>
            <dl className="agent-file-candidate-summary">
              <div>
                <dt>项目</dt>
                <dd>{agentFileApproval.candidate.projectName}</dd>
              </div>
              <div>
                <dt>文档</dt>
                <dd>{agentFileApproval.candidate.documentCount}</dd>
              </div>
              <div>
                <dt>实例</dt>
                <dd>{agentFileApproval.candidate.instanceCount}</dd>
              </div>
            </dl>
            {agentFileApproval.candidate.diagnostics.length > 0 ? (
              <ul className="agent-panel-audit">
                {agentFileApproval.candidate.diagnostics.map(
                  (diagnostic, index) => (
                    <li key={`${diagnostic.severity}-${index}`}>
                      <span>{diagnostic.severity}</span>
                      <span>{diagnostic.message}</span>
                    </li>
                  ),
                )}
              </ul>
            ) : null}
            <div className="agent-panel-controls">
              <button
                type="button"
                data-testid="agent-file-reject"
                onClick={agentFileApproval.onReject}
              >
                拒绝
              </button>
              <button
                type="button"
                data-testid="agent-file-approve"
                onClick={agentFileApproval.onApprove}
              >
                替换项目
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
