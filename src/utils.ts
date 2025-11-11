import { IncomingMessage, ServerResponse } from "http";

export async function readJson<T>(
  req: IncomingMessage,
  limit = 16 * 1024
): Promise<T> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const b = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += b.length;
    if (size > limit)
      throw Object.assign(new Error("Payload too large"), { status: 413 });
    chunks.push(b);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(body) as T;
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

export function send(
  res: ServerResponse,
  status: number,
  body?: unknown,
  headers?: Record<string, string>
) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    ...(headers ?? {}),
  });
  res.end(payload);
}

export function setCors(res: ServerResponse, origin: string) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-api-key");
  res.setHeader("Access-Control-Allow-Methods", "OPTIONS, POST, GET");
}

export function isoNow(): string {
  return new Date().toISOString();
}

// minimalistická validace bez knihoven
const ipV4 =
  /^(25[0-5]|2[0-4]\d|1?\d{1,2})(\.(25[0-5]|2[0-4]\d|1?\d{1,2})){3}$/;
const ipV6 = /^[0-9a-f:]+$/i;

export function validatePayload(input: any) {
  const errors: string[] = [];
  const obj: any = {};

  if (
    typeof input?.ip !== "string" ||
    !(ipV4.test(input.ip) || ipV6.test(input.ip))
  ) {
    errors.push("ip must be IPv4/IPv6 string");
  } else obj.ip = input.ip;

  if (
    typeof input?.visitedAt !== "string" ||
    Number.isNaN(Date.parse(input.visitedAt))
  ) {
    errors.push("visitedAt must be ISO datetime string");
  } else obj.visitedAt = new Date(input.visitedAt).toISOString();

  if (
    typeof input?.path !== "string" ||
    input.path.length === 0 ||
    !input.path.startsWith("/")
  ) {
    errors.push('path must be non-empty string starting with "/"');
  } else obj.path = input.path.slice(0, 1024);

  obj.referrer =
    (typeof input?.referrer === "string" ? input.referrer : null) ?? null;
  obj.articleId =
    (typeof input?.articleId === "string" ? input.articleId : null) ?? null;
  obj.articleTitle =
    (typeof input?.articleTitle === "string" ? input.articleTitle : null) ??
    null;
  obj.userAgent =
    (typeof input?.userAgent === "string" ? input.userAgent : null) ?? null;

  return {
    ok: errors.length === 0,
    value: obj as {
      ip: string;
      visitedAt: string;
      path: string;
      referrer: string | null;
      articleId: string | null;
      articleTitle: string | null;
      userAgent: string | null;
    },
    errors,
  };
}
