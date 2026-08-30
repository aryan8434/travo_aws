import jwt from "jsonwebtoken";

/**
 * Bearer-token auth middleware. Attaches req.userId and req.username from a
 * verified JWT. Rejects with 401 on any problem.
 */
export default function auth(req, res, next) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET missing — rejecting authenticated request");
    return res.status(503).json({ error: "Auth not configured" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.userId = decoded.userId;
    req.username = decoded.username;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
