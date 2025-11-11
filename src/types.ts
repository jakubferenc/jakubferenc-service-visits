export interface TrackPayload {
  ip: string; // IPv4/IPv6
  visitedAt: string; // ISO 8601 (UTC doporučeno)
  referrer?: string | null; // může být prázdný
  path: string; // "/blog/xyz"
  articleId?: string | null;
  articleTitle?: string | null;
  userAgent?: string | null; // volitelné (z FE nebo vyčteme ze socketu)
}
