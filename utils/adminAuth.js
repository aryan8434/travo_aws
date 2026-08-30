import crypto from "crypto";

/**
 * Guards admin-only endpoints. Requires an `x-admin-key` header matching
 * process.env.ADMIN_KEY. Uses a constant-time comparison.
 */
export default function adminAuth(req, res, next) {
  const expected = process.env.ADMIN_KEY;

  if (!expected || expected.length < 12) {
    return res
      .status(503)
      .json({ error: "Admin API disabled — set ADMIN_KEY (min 12 chars)" });
  }

  const provided = req.headers["x-admin-key"] || "";
  const a = Buffer.from(String(provided));
  const b = Buffer.from(expected);

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid admin key" });
  }

  next();
}
