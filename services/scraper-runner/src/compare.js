import crypto from "node:crypto";
export function normalizeContent(content) {
    return content
        .replace(/\r\n/g, "\n")
        .trim();
}
export function hashContent(content) {
    const normalized = normalizeContent(content);
    return crypto
        .createHash("sha256")
        .update(normalized, "utf8")
        .digest("hex");
}
//# sourceMappingURL=compare.js.map