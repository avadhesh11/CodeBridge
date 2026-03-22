import jwt from "jsonwebtoken";
import apiError from "../utils/apiError.js";
import userModel from "../models/user.js";

const ACCESS_SECRET = process.env.ACCESS_SECRET || "ava";

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      console.log("no token found");
      throw new apiError(401, "Unauthorized");
      
    }

    const decoded = jwt.verify(token, ACCESS_SECRET);

    const user = await userModel.findById(decoded.id).select("-password");

    if (!user) {
      console.log("unauthorized user");
      throw new apiError(401, "Unauthorized");
      

    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

export default authMiddleware;
