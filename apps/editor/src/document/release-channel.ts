/**
 * Which release channel this editor is being served from (Deployment rationale).
 *
 * The same build serves the public site and the preview; only the Worker
 * knows which, and it says so at /api/channel. Anything short of a clear
 * "preview" answer is production: a failed request, an old Worker without
 * the endpoint, or a test with no network must never dress the public site
 * up as a preview.
 */
export type ReleaseChannel = "production" | "preview";

export interface ProjectStoreCopy {
  singular: "云项目" | "预览项目";
  plural: "云项目" | "预览项目";
  destination: "Cloud" | "Preview Projects";
}

/** Human-facing storage identity; the underlying Project API is shared. */
export function projectStoreCopy(channel: ReleaseChannel): ProjectStoreCopy {
  return channel === "preview"
    ? {
        singular: "预览项目",
        plural: "预览项目",
        destination: "Preview Projects",
      }
    : {
        singular: "云项目",
        plural: "云项目",
        destination: "Cloud",
      };
}

export async function loadReleaseChannel(
  fetchLike: typeof fetch | null = typeof fetch === "function" ? fetch : null,
): Promise<ReleaseChannel> {
  if (!fetchLike) return "production";
  try {
    const response = await fetchLike("/api/channel", {
      credentials: "same-origin",
    });
    if (!response.ok) return "production";
    const body = (await response.json()) as { channel?: unknown };
    return body.channel === "preview" ? "preview" : "production";
  } catch {
    return "production";
  }
}
