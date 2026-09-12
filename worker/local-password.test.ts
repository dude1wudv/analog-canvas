import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

import {
  AUTH_SESSION_COOKIE,
  AuthDO,
  type AuthEnv,
  type SessionUser,
} from "./auth";
import {
  hashLocalPassword,
  readLocalCredentials,
  verifyLocalPassword,
} from "./local-password";

const ORIGIN = "https://canvas.test";
const PASSWORD = "correct horse";

type SqlResult<T> = {
  toArray(): T[];
  one(): T;
};

function sqliteState() {
  const db = new DatabaseSync(":memory:");
  return {
    storage: {
      sql: {
        exec<T>(query: string, ...bindings: unknown[]): SqlResult<T> {
          const statement = db.prepare(query);
          if (/^\s*(select|with|pragma)/iu.test(query)) {
            const rows = statement.all(
              ...(bindings as (string | number | null)[]),
            ) as T[];
            return {
              toArray: () => rows,
              one: () => {
                if (rows.length !== 1) throw new Error("expected one row");
                return rows[0]!;
              },
            };
          }
          statement.run(...(bindings as (string | number | null)[]));
          return {
            toArray: () => [],
            one: () => {
              throw new Error("no rows");
            },
          };
        },
      },
      transactionSync<T>(callback: () => T): T {
        return callback();
      },
    },
  };
}

function harness(env: Partial<AuthEnv> = {}) {
  const state = sqliteState();
  const durable = new AuthDO(state, {
    AUTH: undefined as never,
    ...env,
  });
  const call = (
    path: string,
    init: RequestInit & { cookie?: string } = {},
  ): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (init.cookie) headers.set("Cookie", init.cookie);
    if (init.method === "POST" && !headers.has("Origin")) {
      headers.set("Origin", ORIGIN);
    }
    const { cookie: _cookie, ...requestInit } = init;
    return durable.fetch(
      new Request(`${ORIGIN}${path}`, { ...requestInit, headers }),
    );
  };
  return { state, durable, call };
}

function cookieValue(response: Response, name: string): string | null {
  for (const header of response.headers.getSetCookie()) {
    const match = header.match(new RegExp(`^${name}=([^;]*)`, "u"));
    if (match) return match[1] ?? null;
  }
  return null;
}

function localBody(username: string, password = PASSWORD): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password }),
  };
}

async function register(
  auth: ReturnType<typeof harness>,
  username: string,
  password = PASSWORD,
): Promise<Response> {
  return auth.call("/api/auth/local/register", localBody(username, password));
}

async function sessionUser(
  auth: ReturnType<typeof harness>,
  cookie: string,
): Promise<SessionUser | null> {
  const response = await auth.call("/api/auth/me", { cookie });
  expect(response.status).toBe(200);
  return ((await response.json()) as { user: SessionUser | null }).user;
}

describe("local password encoding", () => {
  it("uses the versioned scrypt format and verifies without storing plaintext", async () => {
    const encoded = await hashLocalPassword(PASSWORD);

    expect(encoded).toMatch(
      /^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{64}$/u,
    );
    expect(encoded).not.toContain(PASSWORD);
    expect(await verifyLocalPassword(PASSWORD, encoded)).toBe(true);
    expect(await verifyLocalPassword(`${PASSWORD}!`, encoded)).toBe(false);
    expect(await verifyLocalPassword(PASSWORD, "not-a-password-hash")).toBe(
      false,
    );
  });

  it("accepts only JSON credentials with lowercase usernames and preserves password whitespace", async () => {
    const request = (body: unknown, contentType = "application/json") =>
      new Request(`${ORIGIN}/api/auth/local/login`, {
        method: "POST",
        headers: { "content-type": contentType },
        body: JSON.stringify(body),
      });

    await expect(
      readLocalCredentials(
        request({ username: "user_1", password: "            " }),
      ),
    ).resolves.toEqual({ username: "user_1", password: "            " });
    await expect(
      readLocalCredentials(request({ username: "User_1", password: PASSWORD })),
    ).resolves.toBeNull();
    await expect(
      readLocalCredentials(
        request({ username: " user_1 ", password: PASSWORD }),
      ),
    ).resolves.toBeNull();
    await expect(
      readLocalCredentials(
        request(
          { username: "user_1", password: PASSWORD },
          "application/jsonx",
        ),
      ),
    ).resolves.toBeNull();
    await expect(
      readLocalCredentials(
        request({ username: "user_1", password: PASSWORD }, "text/plain"),
      ),
    ).resolves.toBeNull();
  });
});

describe("local AuthDO routes", () => {
  it("keeps local auth dark and does not create its credential table when disabled", async () => {
    const auth = harness();

    expect(await (await auth.call("/api/auth/providers")).json()).toEqual({
      github: false,
      google: false,
      email: false,
    });
    const response = await auth.call(
      "/api/auth/local/register",
      localBody("user_1"),
    );
    expect(response.status).toBe(404);
    expect(
      auth.state.storage.sql
        .exec<{ name: string }>(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'local_credentials'",
        )
        .toArray(),
    ).toEqual([]);
  });

  it("registers and logs in with a session while keeping local credentials separate", async () => {
    const auth = harness({ AUTH_LOCAL_ENABLED: "true" });
    const registered = await register(auth, "user_1");

    expect(registered.status).toBe(201);
    expect(registered.headers.get("cache-control")).toBe("no-store");
    const token = cookieValue(registered, AUTH_SESSION_COOKIE);
    expect(token).toBeTruthy();
    const cookie = `${AUTH_SESSION_COOKIE}=${token}`;
    const setCookie = registered.headers
      .getSetCookie()
      .find((value) => value.startsWith(`${AUTH_SESSION_COOKIE}=`));
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");

    const user = ((await registered.json()) as { user: SessionUser }).user;
    expect(user).toMatchObject({
      displayName: "user_1",
      email: null,
      provider: "local",
      role: "user",
      isAdmin: false,
    });
    expect(await sessionUser(auth, cookie)).toMatchObject(user);

    const credential = auth.state.storage.sql
      .exec<{ username: string; user_id: string; password_hash: string }>(
        "SELECT username, user_id, password_hash FROM local_credentials",
      )
      .one();
    expect(credential.username).toBe("user_1");
    expect(credential.user_id).toBe(user.id);
    expect(credential.password_hash).toMatch(/^scrypt\$/u);
    expect(credential.password_hash).not.toContain(PASSWORD);
    expect(
      auth.state.storage.sql
        .exec<{ email: string | null; provider: string }>(
          "SELECT email, provider FROM users WHERE id = ?",
          user.id,
        )
        .one(),
    ).toEqual({ email: null, provider: "local" });

    const duplicate = await register(auth, "user_1");
    expect(duplicate.status).toBe(409);

    const wrong = await auth.call(
      "/api/auth/local/login",
      localBody("user_1", `${PASSWORD}!`),
    );
    expect(wrong.status).toBe(401);
    const loggedIn = await auth.call(
      "/api/auth/local/login",
      localBody("user_1"),
    );
    expect(loggedIn.status).toBe(200);
    expect(cookieValue(loggedIn, AUTH_SESSION_COOKIE)).toBeTruthy();
  });

  it("bootstraps the configured admin once without replacing its password hash", async () => {
    const initialHash = await hashLocalPassword(PASSWORD);
    const replacementHash = `${initialHash.slice(0, -64)}${"0".repeat(64)}`;
    const state = sqliteState();
    const env: AuthEnv = {
      AUTH: undefined as never,
      AUTH_LOCAL_ENABLED: "true",
      LOCAL_ADMIN_USERNAME: "admin_user",
      LOCAL_ADMIN_PASSWORD_HASH: initialHash,
    };

    const first = new AuthDO(state, env);
    const firstCredential = state.storage.sql
      .exec<{ username: string; user_id: string; password_hash: string }>(
        "SELECT username, user_id, password_hash FROM local_credentials",
      )
      .one();
    expect(firstCredential).toMatchObject({
      username: "admin_user",
      password_hash: initialHash,
    });
    expect(
      state.storage.sql
        .exec<{ provider: string; email: string | null }>(
          "SELECT provider, email FROM users WHERE id = ?",
          firstCredential.user_id,
        )
        .one(),
    ).toEqual({ provider: "local", email: null });

    new AuthDO(state, { ...env, LOCAL_ADMIN_PASSWORD_HASH: replacementHash });
    expect(
      state.storage.sql
        .exec<{ password_hash: string }>(
          "SELECT password_hash FROM local_credentials WHERE username = ?",
          "admin_user",
        )
        .one().password_hash,
    ).toBe(initialHash);

    const durable = first;
    const login = await durable.fetch(
      new Request(`${ORIGIN}/api/auth/local/login`, localBody("admin_user")),
    );
    expect(login.status).toBe(200);
    expect(((await login.json()) as { user: SessionUser }).user.isAdmin).toBe(
      true,
    );
  });

  it("rejects cross-origin and non-JSON requests before authenticating", async () => {
    const auth = harness({ AUTH_LOCAL_ENABLED: "true" });
    const crossOrigin = await auth.call("/api/auth/local/login", {
      ...localBody("user_1"),
      headers: {
        "content-type": "application/json",
        Origin: "https://evil.test",
      },
    });
    expect(crossOrigin.status).toBe(403);

    const contentType = await auth.call("/api/auth/local/login", {
      method: "POST",
      headers: { Origin: ORIGIN, "content-type": "text/plain" },
      body: JSON.stringify({ username: "user_1", password: PASSWORD }),
    });
    expect(contentType.status).toBe(400);
  });

  it("uses only the configured local username for admin status", async () => {
    const auth = harness({
      AUTH_LOCAL_ENABLED: "true",
      LOCAL_ADMIN_USERNAME: "admin_user",
    });
    const first = await register(auth, "first_user");
    expect(first.status).toBe(201);
    const firstUser = ((await first.json()) as { user: SessionUser }).user;
    expect(firstUser.isAdmin).toBe(false);

    const admin = await register(auth, "admin_user");
    expect(admin.status).toBe(201);
    const adminUser = ((await admin.json()) as { user: SessionUser }).user;
    expect(adminUser.isAdmin).toBe(true);
  });

  it("limits attempts per username and per source IP", async () => {
    const auth = harness({ AUTH_LOCAL_ENABLED: "true" });
    auth.state.storage.sql.exec(
      "CREATE TABLE local_credentials (username TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL) WITHOUT ROWID",
    );
    auth.state.storage.sql.exec(
      "CREATE TABLE local_login_rates (bucket TEXT PRIMARY KEY, expires_at INTEGER NOT NULL, count INTEGER NOT NULL) WITHOUT ROWID",
    );
    for (let index = 0; index < 41; index += 1) {
      const username = `u${String(index).padStart(2, "0")}`;
      const userId = `user-${username}`;
      auth.state.storage.sql.exec(
        "INSERT INTO users(id, provider, provider_id, email, display_name, role, created_at) VALUES (?, 'local', ?, NULL, ?, 'user', ?)",
        userId,
        username,
        username,
        new Date().toISOString(),
      );
      auth.state.storage.sql.exec(
        "INSERT INTO local_credentials(username, user_id, password_hash) VALUES (?, ?, 'invalid-hash')",
        username,
        userId,
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const response = await auth.call(
        "/api/auth/local/login",
        localBody("u00"),
      );
      expect(response.status).toBe(401);
    }
    expect(
      (await auth.call("/api/auth/local/login", localBody("u00"))).status,
    ).toBe(429);

    for (let index = 1; index < 41; index += 1) {
      const response = await auth.call("/api/auth/local/login", {
        ...localBody(`u${String(index).padStart(2, "0")}`),
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "192.0.2.1",
        },
      });
      expect(response.status).toBe(401);
    }
    const ipLimited = await auth.call("/api/auth/local/login", {
      ...localBody("u00"),
      headers: {
        "content-type": "application/json",
        "CF-Connecting-IP": "192.0.2.1",
      },
    });
    expect(ipLimited.status).toBe(429);
    expect(ipLimited.headers.get("retry-after")).toBeTruthy();
  });
});
