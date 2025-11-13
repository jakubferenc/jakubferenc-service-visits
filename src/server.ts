// src/server.ts
import "dotenv/config";
import express, { type Request, type Response } from "express";
import { initDb, insertVisit } from "./db.js";
import type { VisitPayload } from "./types.js";
const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(
  express.json({
    limit: "10kb",
  }),
);

app.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.post(
  "/api/visit",
  async (req: Request<{}, {}, VisitPayload>, res: Response) => {
    const { postId, path, postTitle, referrer, userAgent } = req.body ?? {};

    if (
      typeof postId !== "string" ||
      postId.length === 0 ||
      typeof path !== "string" ||
      path.length === 0 ||
      typeof postTitle !== "string" ||
      postTitle.length === 0
    ) {
      return res.status(400).json({
        error: "postId, path and postTitle are required non-empty strings",
      });
    }

    const resolvedReferrer =
      typeof referrer === "string" && referrer.length > 0
        ? referrer
        : req.get("referer") || null;

    const resolvedUserAgent =
      typeof userAgent === "string" && userAgent.length > 0
        ? userAgent
        : req.get("user-agent") || null;

    const ip = req.ip || null;

    try {
      await insertVisit(
        postId,
        path,
        postTitle,
        resolvedReferrer,
        resolvedUserAgent,
        ip,
      );
      return res.sendStatus(204);
    } catch (err) {
      console.error("Error inserting visit", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

const PORT = Number(process.env.PORT) || 8080;

async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
