export interface VisitPayload {
  postId: string;
  path: string; // "/blog/xyz"
  postTitle: string;
  referrer?: string | null; // může být prázdný
  userAgent?: string | null; // volitelné (z FE nebo vyčteme ze socketu)
}
