/** Versioned password hashes; no plaintext credentials enter durable storage. */
import { scryptAsync } from "@noble/hashes/scrypt.js";

const hex = (bytes: Uint8Array) =>
  [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");

async function derive(password: string, salt: Uint8Array): Promise<string> {
  return hex(
    await scryptAsync(password, salt, {
      N: 32768,
      r: 8,
      p: 3,
      dkLen: 32,
      maxmem: 64 * 1024 * 1024,
    }),
  );
}

export async function hashLocalPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `scrypt$32768$8$3$${hex(salt)}$${await derive(password, salt)}`;
}

export async function verifyLocalPassword(
  password: string,
  encoded: string,
): Promise<boolean> {
  const match = /^scrypt\$32768\$8\$3\$([a-f0-9]{32})\$([a-f0-9]{64})$/u.exec(
    encoded,
  );
  if (!match) return false;
  const salt = new Uint8Array(
    match[1]!.match(/../gu)!.map((byte) => Number.parseInt(byte, 16)),
  );
  const actual = await derive(password, salt);
  let different = 0;
  for (let index = 0; index < actual.length; index++)
    different |= actual.charCodeAt(index) ^ match[2]!.charCodeAt(index);
  return different === 0;
}

export async function readLocalCredentials(
  request: Request,
): Promise<{ username: string; password: string } | null> {
  if (
    request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
    "application/json"
  )
    return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    length += chunk.value.length;
    if (length > 4096) {
      await reader.cancel();
      return null;
    }
    chunks.push(chunk.value);
  }
  try {
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const value = JSON.parse(new TextDecoder().decode(bytes)) as {
      username?: unknown;
      password?: unknown;
    };
    if (
      typeof value?.username !== "string" ||
      typeof value.password !== "string"
    )
      return null;
    const username = value.username;
    if (
      !/^[a-z0-9_]{3,32}$/u.test(username) ||
      value.password.length < 12 ||
      value.password.length > 128
    )
      return null;
    return { username, password: value.password };
  } catch {
    return null;
  }
}
