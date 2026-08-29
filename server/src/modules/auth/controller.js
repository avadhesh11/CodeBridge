import authServices from "./services.js";
import userModel from "../../models/user.js";

class authController{
signup=async(req,res,next)=>{
try {
    const {name,email,password}=req.body;
    if(!name || !email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
   const user=await authServices.signup(name,email,password);
    res.cookie("accessToken", user.accessToken, {
      httpOnly: true,
      secure: false, // false for local development
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for testinggg
    });

    res.cookie("refreshToken", user.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

return res.status(201).json({
    message:"User created succesfully",
    user:user.user,
    token:user.accessToken

});

} catch (error) {
    next(error);
}
}

login=async(req,res,next)=>{
try {
    const {email,password}=req.body;
    if( !email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
   const user=await authServices.login(email,password);
    res.cookie("accessToken", user.accessToken, {
      httpOnly: true,
      secure: false, // false for local development
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for testinggg
    });

    res.cookie("refreshToken", user.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

return res.status(201).json({
    message:"User logged in succesfully",
    user:user.user,
    token:user.accessToken
});

} catch (error) {
    next(error);
}
}

updateProfile = async (req, res, next) => {
  try {
    const { name, bio, company, location, skills, role, avatar } = req.body;
    const userId = req.user._id;

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

    // Set cookies
    res.cookie("accessToken", authenticated.accessToken, {
      httpOnly: true,
      secure: false, // false for local development
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    res.cookie("refreshToken", authenticated.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return res.redirect(frontendUrl);

  } catch (error) {
    next(error);
  }
};

logout = async (req, res, next) => {
  try {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};
};

export default new authController();