import "dotenv/config";

function req(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  port: Number(req("PORT", "8080")),
  dbPath: req("DB_PATH", "./data/visits.db"),
  corsOrigin: req("CORS_ORIGIN", "*"), // případně konkrétní doména FE
  // jednoduché zabezpečení: volitelný API key v hlavičce "x-api-key"
  apiKey: process.env.API_KEY || null,
} as const;
