import userModel from "../../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import apiError from "../../utils/apiError.js";
const ACCESS_SECRET = process.env.ACCESS_SECRET || "ava";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "ava";

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    ACCESS_SECRET,
    { expiresIn: "30d" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "7d" });
}

class authServices{
signup=async(name,email,password)=>{
const user=await userModel.findOne({email});
if(user){
    throw new apiError(400,"user already exist");
}
const hashedPassword = await bcrypt.hash(password, 10);
const newUser=await userModel.create({
    name,
    email,
    password:hashedPassword
});

const accessToken = generateAccessToken(newUser);
const refreshToken = generateRefreshToken(newUser);
 newUser.currentRefreshToken=refreshToken;
 await newUser.save();
 return {
     user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
      accessToken,
      refreshToken,
};
}

login=async(email,password)=>{
const user=await userModel.findOne({email});
if(!user){
    throw new apiError(400,"user doesn't exist");
}
const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      throw new apiError(401,"Invalid credentials") ;

const accessToken = generateAccessToken(user);
const refreshToken = generateRefreshToken(user);
 user.currentRefreshToken=refreshToken;
 await user.save();
 return {
     user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  }

  githubAuth = async (githubUser, email) => {
    let user = await userModel.findOne({
      $or: [
        { githubId: githubUser.id.toString() },
        { email }
      ]
    });

    if (!user) {
      user = await userModel.create({
        name: githubUser.name || githubUser.login,
        email,
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
        id: user._id,
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  };
};

export default new authServices();