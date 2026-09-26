import taxonomy from "../../../../../config/gallery-taxonomy.json";
import { useEffect, useState } from "react";

import type { SubmissionGateReport } from "@icm/derived";
import type { CircuitProject } from "@icm/model";
import { galleryTagLabel } from "../../gallery-tag-label";

import {
  describePublishOutcome,
  GALLERY_DESCRIPTION_LIMIT,
  type GalleryPublishFields,
  type GalleryPublishOutcome,
  type PublishSessionUser,
} from "./gallery-publish";
import { GalleryTopologyCheck } from "./gallery-topology-check";

export interface PublishGalleryDialogProps {
  defaultName: string;
  publicationLinkLoading?: boolean;
  publicationLinkError?: string | null;
  publicationLinkNotice?: string | null;
  onRetryPublicationLink?: () => void;
  onLinkExisting?: (url: string) => Promise<void>;
  /** The signed-in user; null means there is nothing to publish with yet. */
  session?: PublishSessionUser | null;
  /** Quality-gate evaluation of the live Project. */
  gateReport?: SubmissionGateReport | null;
  /** Current Cell projected as the duplicate-comparison root. */
  topologyProject?: CircuitProject | null;
  /** Present when the current Project is associated with a gallery entry the
   * signed-in user may update (owner, admin, or moderator). */
  updateTarget?: { id: string; name: string } | null;
  /** The opened entry's stored fields, prefilled once in update mode. */
  updateDefaults?: {
    description: string;
    tags: readonly string[];
  } | null;
  publish: (fields: GalleryPublishFields) => Promise<GalleryPublishOutcome>;
  publishUpdate?:
    | ((fields: GalleryPublishFields) => Promise<GalleryPublishOutcome>)
    | undefined;
  onPublished: (outcome: {
    id: string;
    name: string;
    description: string;
    tags: readonly string[];
    updated: boolean;
    previewRevision?: string;
  }) => void;
  /** Moderators and the entry's owner: open the version history instead.
   * Rendered only alongside an update target. */
  onShowHistory?: (() => void) | undefined;
  onClose: () => void;
  /**
   * What was typed last time the dialog was open. The dialog unmounts on
   * close, so without somewhere outside it to keep them, a mistaken click on
   * the backdrop threw away everything the person had written.
   */
  draft?: PublishGalleryDraft | null;
  onDraftChange?: ((draft: PublishGalleryDraft) => void) | undefined;
}

export interface PublishGalleryDraft {
  name: string;
  description: string;
  tags: readonly string[];
  editedFields?: { name: boolean; description: boolean; tags: boolean };
}

/**
 * File > "Publish to Gallery…". Signing in is the whole gate: any signed-in
 * account publishes straight to the wall — no passphrase, no review queue.
 * The byline is the account's display name, which the server reads from the
 * session rather than from this form, so one account cannot publish under
 * another's name. Quality checks are advisory for every role: the list keeps
 * publishers informed, but the checker has false positives and sharing a
 * work-in-progress sketch is legitimate, so nothing here blocks Publish.
 */
export function PublishGalleryDialog({
  defaultName,
  publicationLinkLoading = false,
  publicationLinkError = null,
  publicationLinkNotice = null,
  onRetryPublicationLink,
  onLinkExisting,
  session = null,
  gateReport = null,
  topologyProject = null,
  updateTarget = null,
  updateDefaults = null,
  publish,
  publishUpdate,
  onPublished,
  onShowHistory,
  onClose,
  draft = null,
  onDraftChange,
}: PublishGalleryDialogProps) {
  const signedOut = session === null;
  const canUpdate = updateTarget !== null && publishUpdate !== undefined;
  const [mode, setMode] = useState<"update" | "new">(
    canUpdate ? "update" : "new",
  );
  const updating = canUpdate && mode === "update";
  const [name, setName] = useState(draft?.name ?? defaultName);
  const [nameEdited, setNameEdited] = useState(
    draft?.editedFields?.name ?? !!draft?.name,
  );
  useEffect(() => {
    if (!nameEdited) setName(defaultName);
  }, [defaultName, nameEdited]);
  const [description, setDescription] = useState(draft?.description ?? "");
  const [descriptionEdited, setDescriptionEdited] = useState(
    draft?.editedFields?.description ?? !!draft?.description,
  );
  const [tags, setTags] = useState<string[]>([...(draft?.tags ?? [])]);
  const [tagsEdited, setTagsEdited] = useState(
    draft?.editedFields?.tags ?? !!draft?.tags.length,
  );
  const [tagDraft, setTagDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The update permission arrives with the session; default to updating the
  // opened entry unless the user already chose a mode.
  const [modeTouched, setModeTouched] = useState(false);
  useEffect(() => {
    if (canUpdate && !modeTouched) setMode("update");
  }, [canUpdate, modeTouched]);

  // Follow the chosen publication, preserving fields the author explicitly edited.
  useEffect(() => {
    if (!canUpdate || !updateDefaults) return;
    if (!descriptionEdited) setDescription(updateDefaults.description);
    if (!tagsEdited)
      setTags((previous) =>
        previous.length === updateDefaults.tags.length &&
        previous.every((tag, index) => tag === updateDefaults.tags[index])
          ? previous
          : [...updateDefaults.tags],
      );
  }, [canUpdate, updateDefaults, descriptionEdited, tagsEdited]);

  // Report the draft outward on every keystroke, so it survives whichever way
  // the dialog closes — backdrop, Escape, or Cancel.
  useEffect(() => {
    onDraftChange?.({
      name,
      description,
      tags,
      editedFields: {
        name: nameEdited,
        description: descriptionEdited,
        tags: tagsEdited,
      },
    });
  }, [
    name,
    description,
    tags,
    nameEdited,
    descriptionEdited,
    tagsEdited,
    onDraftChange,
  ]);

  // The limit is shown, never enforced by clipping: a textarea maxLength cut
  // a pasted citation short without a word, and the text was published cut.
  const descriptionLength = description.trim().length;
  const descriptionTooLong = descriptionLength > GALLERY_DESCRIPTION_LIMIT;

  const hasDraft =
    description.trim().length > 0 ||
    tags.length > 0 ||
    tagDraft.trim().length > 0 ||
    name.trim() !== defaultName.trim();

  function addTag(raw: string): void {
    const tag = raw.replace(/\s+/gu, " ").trim().toLowerCase();
    if (!tag) return;
    setTagsEdited(true);
    setTags((previous) =>
      previous.includes(tag) || previous.length >= 12
        ? previous
        : [...previous, tag],
    );
    setTagDraft("");
  }

  async function submit(): Promise<void> {
    if (publicationLinkLoading || publicationLinkError || linkBusy) return;
    const pendingTag = tagDraft.replace(/\s+/gu, " ").trim().toLowerCase();
    const submittedTags =
      pendingTag && !tags.includes(pendingTag) && tags.length < 12
        ? [...tags, pendingTag]
        : tags;
    if (pendingTag) setTagsEdited(true);
    setTags(submittedTags);
    setTagDraft("");
    setBusy(true);
    setError(null);
    const send = updating ? (publishUpdate ?? publish) : publish;
    const outcome = await send({ name, description, tags: submittedTags });
    if (outcome.status === "published") {
      onPublished({
        id: outcome.id,
        name: name.trim(),
        description: description.trim(),
        tags: submittedTags,
        updated: updating,
        ...(outcome.previewRevision === undefined
          ? {}
          : { previewRevision: outcome.previewRevision }),
      });
      return;
    }
    setBusy(false);
    setError(describePublishOutcome(outcome));
  }

  return (
    <div
      className="insert-dialog-backdrop"
      onPointerDown={(event) => {
        // A stray click beside a form someone has been writing in is far more
        // likely a miss than a decision to abandon it. Cancel and Escape are
        // still there, and both now keep the draft.
        if (event.target !== event.currentTarget || busy || hasDraft) return;
        onClose();
      }}
    >
      <section
        className="publish-gallery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="publish-gallery-title"
        data-testid="publish-gallery-dialog"
      >
        <header className="publish-gallery-header">
          <p>将此电路分享到公开展示墙</p>
          <h2 id="publish-gallery-title">发布到画廊</h2>
        </header>
        {signedOut ? (
          // Nothing to fill in until there is an account to publish under:
          // the byline, the ownership, and the credential all come from it.
          <div className="publish-gallery-signin" data-testid="publish-signin">
            <p>发布需要登录账户，以便电路署名，并保留编辑或撤回的权限。</p>
            <div className="publish-gallery-signin-actions">
              <a
                href="/api/auth/github/start"
                data-testid="publish-signin-github"
              >
                使用 GitHub 继续
              </a>
              <a
                href="/api/auth/google/start"
                data-testid="publish-signin-google"
              >
                使用 Google 继续
              </a>
            </div>
            <p className="publish-gallery-signin-note">
              更喜欢邮箱登录？请在画廊页面的账户菜单中获取一次性登录链接。
            </p>
          </div>
        ) : (
          <>
            {publicationLinkLoading ? (
              <p role="status">正在加载关联的作品…</p>
            ) : null}
            {publicationLinkError ? (
              <p role="alert">
                {publicationLinkError}{" "}
                <button type="button" onClick={onRetryPublicationLink}>
                  重试
                </button>
              </p>
            ) : null}
            {publicationLinkNotice ? <p>{publicationLinkNotice}</p> : null}
            {onLinkExisting &&
            !publicationLinkLoading &&
            !publicationLinkError ? (
              <details className="publish-gallery-link-existing">
                <summary>使用已有的画廊作品…</summary>
                <p>
                  粘贴已有作品的画廊链接，以此草稿作为更新来源。更新后将保留公开链接、点赞、作者和历史记录；之前的项目草稿仍会保存。
                </p>
                <input
                  aria-label="已有作品的画廊链接"
                  autoComplete="off"
                  placeholder="/g/…"
                  value={linkInput}
                  onChange={(event) => setLinkInput(event.currentTarget.value)}
                />
                <button
                  type="button"
                  disabled={busy || linkBusy || !linkInput.trim()}
                  onClick={() => {
                    setLinkBusy(true);
                    setError(null);
                    void onLinkExisting(linkInput)
                      .then(() => {
                        setMode("update");
                        setModeTouched(false);
                      })
                      .catch((cause: unknown) =>
                        setError(
                          cause instanceof Error
                            ? cause.message
                            : "无法关联此作品。",
                        ),
                      )
                      .finally(() => setLinkBusy(false));
                  }}
                >
                  {linkBusy ? "正在加载…" : "使用此作品"}
                </button>
              </details>
            ) : null}
            {canUpdate ? (
              <div className="publish-gallery-mode" data-testid="publish-mode">
                <label>
                  <input
                    dir="auto"
                    type="radio"
                    name="publish-mode"
                    checked={mode === "update"}
                    onChange={() => {
                      setMode("update");
                      setModeTouched(true);
                    }}
                  />
                  更新“{updateTarget?.name}”（替换该作品）
                </label>
                <label>
                  <input
                    dir="auto"
                    type="radio"
                    name="publish-mode"
                    checked={mode === "new"}
                    onChange={() => {
                      setMode("new");
                      setModeTouched(true);
                    }}
                  />
                  发布为新作品
                </label>
                {onShowHistory ? (
                  <button
                    type="button"
                    className="publish-gallery-history-link"
                    data-testid="publish-history"
                    onClick={onShowHistory}
                  >
                    版本历史…
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="publish-gallery-fields">
              <label>
                电路名称
                <input
                  dir="auto"
                  aria-label="电路名称"
                  autoComplete="off"
                  value={name}
                  maxLength={120}
                  autoFocus
                  onChange={(event) => {
                    setNameEdited(true);
                    setName(event.currentTarget.value);
                  }}
                />
              </label>
              <label>
                <span>
                  描述 <span className="publish-gallery-optional">可选</span>
                </span>
                <textarea
                  dir="auto"
                  aria-label="描述"
                  aria-describedby="publish-gallery-description-count"
                  aria-invalid={descriptionTooLong}
                  value={description}
                  rows={3}
                  onChange={(event) => {
                    setDescriptionEdited(true);
                    setDescription(event.currentTarget.value);
                  }}
                />
                <span
                  id="publish-gallery-description-count"
                  className="publish-gallery-count"
                  data-over={descriptionTooLong ? "true" : "false"}
                  data-testid="publish-description-count"
                >
                  {descriptionTooLong
                    ? `${descriptionLength} / ${GALLERY_DESCRIPTION_LIMIT} 字符 · 请缩短描述后发布`
                    : `${descriptionLength} / ${GALLERY_DESCRIPTION_LIMIT}`}
                </span>
              </label>
              <div className="publish-gallery-tags" data-testid="publish-tags">
                <span className="publish-gallery-tags-label">
                  标签{" "}
                  <span className="publish-gallery-optional">最多 12 个</span>
                </span>
                {tags.length > 0 ? (
                  <div className="publish-gallery-tag-chips">
                    {tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="publish-gallery-tag"
                        data-testid={`publish-tag-${tag}`}
                        title="移除标签"
                        onClick={() => {
                          setTagsEdited(true);
                          setTags((previous) =>
                            previous.filter((candidate) => candidate !== tag),
                          );
                        }}
                      >
                        {galleryTagLabel(tag)} ×
                      </button>
                    ))}
                  </div>
                ) : null}
                <input
                  dir="auto"
                  aria-label="添加标签"
                  autoComplete="off"
                  placeholder="输入标签并按 Enter"
                  value={tagDraft}
                  maxLength={32}
                  onChange={(event) => setTagDraft(event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === ",") {
                      event.preventDefault();
                      addTag(tagDraft);
                    }
                  }}
                />
                <div className="publish-gallery-tag-presets">
                  {[...new Set(Object.values(taxonomy.tagsByGroup).flat())]
                    .filter(
                      (preset) =>
                        !tags.includes(preset) &&
                        preset.includes(tagDraft.trim().toLowerCase()),
                    )
                    .slice(0, 12)
                    .map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        data-testid={`publish-preset-${preset.replace(/\s/gu, "-")}`}
                        onClick={() => addTag(preset)}
                      >
                        + {galleryTagLabel(preset)}
                      </button>
                    ))}
                </div>
              </div>
            </div>
            {gateReport && gateReport.failures.length > 0 ? (
              <div
                className="publish-gallery-gates"
                data-testid="publish-gallery-gates"
              >
                <p>质量检查——建议查看，但仍可继续发布：</p>
                <ul>
                  {gateReport.failures.map((failure) => (
                    <li key={failure.code}>
                      {failure.message}
                      {failure.count > 1 ? ` (${failure.count})` : ""}
                      {failure.examples.length > 0
                        ? ` — ${failure.examples.join(", ")}`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="publish-gallery-note">
              {updating
                ? `以 ${session?.displayName} 的身份发布——将更新已有作品。`
                : `以 ${session?.displayName} 的身份发布——作品将立即公开。`}
            </p>
          </>
        )}
        {error ? (
          <p role="alert" className="publish-gallery-error">
            {error}
          </p>
        ) : null}
        <div className="publish-gallery-actions">
          <button type="button" disabled={busy} onClick={onClose}>
            {signedOut ? "关闭" : "取消"}
          </button>
          {!signedOut && topologyProject ? (
            <GalleryTopologyCheck project={topologyProject} />
          ) : null}
          {signedOut ? null : (
            <button
              type="button"
              className="publish-gallery-primary"
              disabled={
                busy ||
                linkBusy ||
                publicationLinkLoading ||
                !!publicationLinkError ||
                name.trim() === "" ||
                descriptionTooLong
              }
              onClick={() => void submit()}
            >
              {busy ? "正在发布…" : updating ? "更新作品" : "发布"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
