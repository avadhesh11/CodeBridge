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
};

export default new authController();