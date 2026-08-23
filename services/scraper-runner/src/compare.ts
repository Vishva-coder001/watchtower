import crypto from "node:crypto";

export function normalizeContent(content: string): string {
  return content
    .replace(/\r\n/g, "\n")
    .trim();
}

export function hashContent(content: string): string {
  const normalized = normalizeContent(content);

  return crypto
    .createHash("sha256")
    .update(normalized, "utf8")
    .digest("hex");
}