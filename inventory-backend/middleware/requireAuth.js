import jwt from "jsonwebtoken";
import User from "../models/User.js";

const unauthorized = (res, message = "Please log in to continue.") =>
  res.status(401).json({ success: false, message });

// Identifies the caller from the Bearer token and loads their user + role.
// Permissions are read from the role on every request, so a role edit
// applies immediately (the token only holds the user id).
export default async function requireAuth(req, res, next) {
  try {
    const [scheme, token] = (req.headers.authorization || "").split(" ");
    if (scheme !== "Bearer" || !token) return unauthorized(res);

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return unauthorized(res, "Your session has expired. Please log in again.");
    }

    const user = await User.findById(payload.id).populate("role");
    if (!user) {
      return unauthorized(res, "Your session is no longer valid. Please log in again.");
    }
    // 401 (not 403) so the app signs the person out.
    if (user.isActive === false) {
      return unauthorized(res, "Your account has been disabled.");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("requireAuth error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Something went wrong. Please try again." });
  }
}
