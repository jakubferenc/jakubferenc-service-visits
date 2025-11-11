import Database from "better-sqlite3";
import { config } from "./config.js";
import fs from "fs";
import path from "path";

const dir = path.dirname(config.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

export const db = new Database(config.dbPath, { fileMustExist: false });

db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  visited_at TEXT NOT NULL,       -- ISO string
  referrer TEXT,
  path TEXT NOT NULL,
  article_id TEXT,
  article_title TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_visits_path ON visits(path);
`);

export const insertVisit = db.prepare(`
INSERT INTO visits (ip, visited_at, referrer, path, article_id, article_title, user_agent)
VALUES (@ip, @visitedAt, @referrer, @path, @articleId, @articleTitle, @userAgent)
`);

export function addVisit(row: {
  ip: string;
  visitedAt: string;
  referrer: string | null;
  path: string;
  articleId: string | null;
  articleTitle: string | null;
  userAgent: string | null;
}) {
  insertVisit.run(row);
}

export const selectCount = db.prepare(`SELECT COUNT(*) as c FROM visits`);
