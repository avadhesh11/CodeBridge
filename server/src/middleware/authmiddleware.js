import jwt from "jsonwebtoken";
import apiError from "../utils/apiError.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET;

const authMiddleware = async (req, res, next) => {
  try {
    if (!ACCESS_SECRET) {
      throw new Error("ACCESS_SECRET env variable is not set");
    }

    const authHeader = req.headers.authorization;
    const token =
      req.cookies?.accessToken ||
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null);

    if (!token) {
      throw new apiError(401, "Unauthorized");
    }

    // JWT-only verification — no DB hit per request.
    // Token payload contains: { id, name, email, iat, exp }
    const decoded = jwt.verify(token, ACCESS_SECRET);

    // Normalise to { _id, id, name, email } so both req.user._id and req.user.id work.
    req.user = {
      _id: decoded.id,
      id:  decoded.id,
      name: decoded.name,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return next(new apiError(401, "Unauthorized"));
    }
    next(error);
  }
};

export default authMiddleware;
