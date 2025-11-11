import { createServer } from "http";
import { config } from "./config.js";
import { addVisit, selectCount } from "./db.js";
import { readJson, send, validatePayload, setCors, isoNow } from "./utils.js";
import { URL } from "url";

const server = createServer(async (req, res) => {
  // CORS
  setCors(res, config.corsOrigin);

  // Preflight
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

  // Healthcheck
  if (req.method === "GET" && req.url?.startsWith("/health")) {
    const { c } = selectCount.get() as { c: number };
    return send(res, 200, { status: "ok", time: isoNow(), rows: c });
  }

  // Simple root
  if (req.method === "GET" && req.url === "/") {
    return send(res, 200, { name: "node-ts-sqlite-tracker", time: isoNow() });
  }

  // Tracking endpoint
  if (req.method === "POST" && req.url?.startsWith("/track")) {
    // Volitelný API key
    if (config.apiKey) {
      const key = req.headers["x-api-key"];
      if (typeof key !== "string" || key !== config.apiKey) {
        return send(res, 401, { error: "Unauthorized" });
      }
    }

    try {
      const payload = await readJson<any>(req, 32 * 1024);
      // Pokud FE nepošle userAgent, můžeme si doplnit z hlavičky
      if (!payload.userAgent && typeof req.headers["user-agent"] === "string") {
        payload.userAgent = req.headers["user-agent"];
      }
      // Pokud FE nepošle ip, lze případně vzít z X-Forwarded-For / socketu (ale ty jsi chtěl posílat ip z FE)
      if (!payload.ip) {
        const xff = (req.headers["x-forwarded-for"] as string | undefined)
          ?.split(",")[0]
          ?.trim();
        payload.ip = xff || (req.socket.remoteAddress ?? "");
      }

      const v = validatePayload(payload);
      if (!v.ok)
        return send(res, 400, {
          error: "Validation failed",
          details: v.errors,
        });

      addVisit(v.value);
      // minimalistická odpověď
      return send(res, 204);
    } catch (err: any) {
      const status = err?.status ?? 500;
      return send(res, status, { error: err?.message ?? "Internal error" });
    }
  }

  // 404
  send(res, 404, { error: "Not found" });
});

server.listen(config.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on :${config.port}`);
});
