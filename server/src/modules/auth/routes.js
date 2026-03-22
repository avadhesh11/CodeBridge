import express from "express";
import authController from "./controller.js";
import userModel from "../../models/user.js";
const router=express.Router();
router.post("/login",authController.login);
router.post("/signup",authController.signup);

function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user._id,
      name: user.name,
      email: user.email,
    },
    process.env.ACCESS_SECRET,
    { expiresIn: "30d" }
  );
}
router.post("/refrsh",async (req, res) => {

  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);

   const accessToken=generateAccessToken(decoded);
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false, // make it true for productionnnn
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days for testinggg
    });

    res.json({ success: true });

  } catch (err) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
}
);
// router.get("/me",async(req,res,next)=>{
// try {
//     const token = req.cookies.accessToken;

//     if (!token) {
//       console.log("no token found");
//       throw new apiError(401, "Unauthorized");
      
//     }

//     const decoded = jwt.verify(token, ACCESS_SECRET);

//     const user = await userModel.findById(decoded.id).select("-password");

//     if (!user) {
//       console.log("unauthorized user");
//       throw new apiError(401, "Unauthorized");
//     }
//     res.status(200).json({
//       message:"User found",
//       user
//     })

//   }catch(error){
//     next(error);
//   }

// })
export default router;