import authServices from "./services.js";
import userModel from "../../models/user.js";
import jwt from "jsonwebtoken";
import { cookieOpts } from "./routes.js";

class authController{
signup=async(req,res,next)=>{
try {
    const {name,email,password}=req.body;
    if(!name || !email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
    const user = await authServices.signup(name, email, password);
    res.cookie("accessToken", user.accessToken, cookieOpts(30));
    res.cookie("refreshToken", user.refreshToken, cookieOpts(7));


    return res.status(201).json({
      message: "User created succesfully",
      user: user.user,
      token: user.accessToken
    });

  } catch (error) {
    next(error);
  }
}

login=async(req,res,next)=>{
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const user = await authServices.login(email, password);
    res.cookie("accessToken", user.accessToken, cookieOpts(30));
    res.cookie("refreshToken", user.refreshToken, cookieOpts(7));


    return res.status(200).json({
      message: "User logged in succesfully",
      user: user.user,
      token: user.accessToken
    });

  } catch (error) {
    next(error);
}
}

updateProfile = async (req, res, next) => {
  try {
    const { name, bio, company, location, skills, role, avatar } = req.body;
    const userId = req.user._id;

    // Validate avatar is a valid URL if provided
    if (avatar && avatar.trim()) {
      try {
        const url = new URL(avatar);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return res.status(400).json({ success: false, message: "Avatar must be a valid http/https URL" });
        }
      } catch {
        return res.status(400).json({ success: false, message: "Avatar must be a valid URL" });
      }
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { name, bio, company, location, skills, role, avatar },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};


githubRedirect = async (req, res, next) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = `${process.env.BACKEND_URL || "http://localhost:5000"}/api/auth/github/callback`;
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user:email`;
    return res.redirect(githubUrl);
  } catch (error) {
    next(error);
  }
};

githubCallback = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ message: "Authorization code not provided" });
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // Exchange code for token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(400).json({ message: "Failed to obtain access token from GitHub" });
    }

    // Fetch user profile
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const githubUser = await userResponse.json();

    // Fetch user emails
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const emails = await emailsResponse.json();

    let primaryEmailObj = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) : null;
    if (!primaryEmailObj && Array.isArray(emails)) {
      primaryEmailObj = emails[0];
    }

    if (!primaryEmailObj || !primaryEmailObj.email) {
      return res.status(400).json({ message: "No verified primary email found for GitHub user" });
    }

    const email = primaryEmailObj.email;

    // Authenticate / Register user
    const authenticated = await authServices.githubAuth(githubUser, email);

    // Set cookies with env-aware options
    res.cookie("accessToken", authenticated.accessToken, cookieOpts(30));
    res.cookie("refreshToken", authenticated.refreshToken, cookieOpts(7));


    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(frontendUrl);

  } catch (error) {
    next(error);
  }
};

logout = async (req, res, next) => {
  try {
    // Revoke the refresh token in DB so it can't be used again
    const token = req.cookies?.accessToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_SECRET);
        await userModel.findByIdAndUpdate(decoded.id, { currentRefreshToken: null });
      } catch { /* token may be expired — still clear cookies */ }
    }

    const clearOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: process.env.NODE_ENV === "production" ? "none" : "lax" };
    res.clearCookie("accessToken", clearOpts);
    res.clearCookie("refreshToken", clearOpts);
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

};

export default new authController();