import userModel from "../../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import apiError from "../../utils/apiError.js";

const ACCESS_SECRET  = process.env.ACCESS_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  console.error("[FATAL] ACCESS_SECRET or REFRESH_SECRET env variable is not set!");
  // Don't crash in test/CI but log loudly
}


export function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, name: user.name, email: user.email },
    ACCESS_SECRET,
    { expiresIn: "30d" }
  );
}

export function generateRefreshToken(user) {
  return jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "7d" });
}


class authServices {
  signup = async (name, email, password) => {
    const cleanName = (name || "").trim();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      throw new apiError(400, "All fields are required");
    }

    if (password.length < 6) {
      throw new apiError(400, "Password must be at least 6 characters long");
    }

    const existingUser = await userModel.findOne({ email: cleanEmail });
    if (existingUser) {
      throw new apiError(400, "User already exists with this email");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await userModel.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: "interviewer"
    });

    const accessToken = generateAccessToken(newUser);
    const refreshToken = generateRefreshToken(newUser);
    newUser.currentRefreshToken = refreshToken;
    await newUser.save();

    return {
      user: {
        _id: newUser._id,
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role || "interviewer",
        avatar: newUser.avatar || ""
      },
      accessToken,
      refreshToken,
    };
  };

  login = async (email, password) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    const user = await userModel.findOne({ email: cleanEmail });
    if (!user) {
      throw new apiError(400, "User does not exist");
    }

    if (!user.password) {
      throw new apiError(
        400,
        "This account was registered via GitHub. Please sign in with GitHub."
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new apiError(401, "Invalid credentials");
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.currentRefreshToken = refreshToken;
    await user.save();

    return {
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "interviewer",
        avatar: user.avatar || ""
      },
      accessToken,
      refreshToken,
    };
  };

  githubAuth = async (githubUser, email) => {
    const cleanEmail = (email || "").trim().toLowerCase();
    let user = await userModel.findOne({
      $or: [
        { githubId: githubUser.id.toString() },
        { email: cleanEmail }
      ]
    });

    if (!user) {
      user = await userModel.create({
        name: (githubUser.name || githubUser.login || "GitHub User").trim(),
        email: cleanEmail,
        githubId: githubUser.id.toString(),
        avatar: githubUser.avatar_url || "",
        role: "interviewer"
      });
    } else {
      let changed = false;
      if (!user.githubId) {
        user.githubId = githubUser.id.toString();
        changed = true;
      }
      if (!user.avatar && githubUser.avatar_url) {
        user.avatar = githubUser.avatar_url;
        changed = true;
      }
      if (changed) {
        await user.save();
      }
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    user.currentRefreshToken = refreshToken;
    await user.save();

    return {
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || "interviewer",
        avatar: user.avatar || ""
      },
      accessToken,
      refreshToken,
    };
  };
};

export default new authServices();