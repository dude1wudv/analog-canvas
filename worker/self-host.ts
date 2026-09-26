import worker from "./index";
export {
  AnalyticsDO,
  AgentSessionDO,
  GalleryDO,
  AuthDO,
  ComponentLibraryDO,
  TopologyTaskDO,
} from "./index";

type SelfHostEnv = Parameters<typeof worker.fetch>[1] & {
  PUBLIC_ORIGIN: string;
  SOURCE_REVISION?: string;
};

/** The existing production Worker, behind a trusted HTTPS ingress on a single host. */
export default {
  async fetch(request: Request, env: SelfHostEnv): Promise<Response> {
    const incoming = new URL(request.url);
    if (incoming.pathname === "/health" && request.method === "GET")
      return Response.json({ status: "ok" });
    if (incoming.pathname === "/source") {
      return Response.redirect(
        `https://github.com/dude1wudv/analog-canvas/tree/${env.SOURCE_REVISION || "codex/image-spice-import"}`,
        302,
      );
    }
    // The socket is private. Canonicalize protocol/origin for secure cookies,
    // CSRF checks and Agent URLs instead of accepting arbitrary forwarded hosts.
    const url = new URL(env.PUBLIC_ORIGIN);
    url.pathname = incoming.pathname;
    url.search = incoming.search;
    try {
      return await worker.fetch(new Request(url, request), env);
    } catch {
      return Response.json(
        { error: "internal-error" },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }
  },
};
