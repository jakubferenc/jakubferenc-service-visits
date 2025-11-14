import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({ connectionString });

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

export async function hasRecentVisit(
  postId: string,
  ip: string | null,
): Promise<boolean> {
  if (!ip) return false;

  const result = await pool.query(
    `
      SELECT 1
      FROM visits
      WHERE post_id = $1
        AND ip = $2
        AND created_at > NOW() - INTERVAL '1 minute'
      LIMIT 1
    `,
    [postId, ip],
  );

  return (result?.rowCount || 0) > 0;
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
