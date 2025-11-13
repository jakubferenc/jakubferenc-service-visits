// src/db.ts
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL env var is required");
}

export const pool = new Pool({
  connectionString,
});

// Call once at startup to ensure table exists
export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      post_id TEXT NOT NULL,
      path TEXT NOT NULL,
      post_title TEXT NOT NULL,
      referrer TEXT,
      user_agent TEXT,
      ip TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export async function insertVisit(
  postId: string,
  path: string,
  postTitle: string,
  referrer: string | null,
  userAgent: string | null,
  ip: string | null,
) {
  await pool.query(
    `
      INSERT INTO visits (post_id, path, post_title, referrer, user_agent, ip)
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [postId, path, postTitle, referrer, userAgent, ip],
  );
}
