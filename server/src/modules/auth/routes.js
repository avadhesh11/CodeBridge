import express from "express";
import authController from "./controller.js";
import userModel from "../../models/user.js";
import jwt from "jsonwebtoken";
import authMiddleware from "../../middleware/authmiddleware.js";

const router = express.Router();

// Cookie options — env-aware.
// Production needs secure:true + sameSite:none for cross-origin cookie delivery.
// Dev uses insecure cookies so they work on http://localhost.
const IS_PROD = process.env.NODE_ENV === "production";
export const cookieOpts = (maxAgeDays = 30) => ({
  httpOnly: true,
  secure: IS_PROD,
  sameSite: IS_PROD ? "none" : "lax",
  maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
});

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/logout", authController.logout);
router.get("/github", authController.githubRedirect);
router.get("/github/callback", authController.githubCallback);

// Token refresh — validates that refreshToken matches the one stored in DB
// so that logout (which clears currentRefreshToken) actually revokes access.
router.post("/refresh", async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

    // Validate token is not revoked (matches DB record)
    const user = await userModel.findById(decoded.id).select("currentRefreshToken name email");
    if (!user || user.currentRefreshToken !== refreshToken) {
      return res.status(403).json({ message: "Refresh token revoked" });
    }

    // Issue new access token using the shared token generator in authServices
    const { generateAccessToken } = await import("../auth/services.js");
    const newAccessToken = generateAccessToken(user);

    res.cookie("accessToken", newAccessToken, cookieOpts(30));
    res.json({ success: true });

  } catch (err) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
});

router.put("/profile", authMiddleware, authController.updateProfile);

export default router;