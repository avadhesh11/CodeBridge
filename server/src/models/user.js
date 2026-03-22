import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  currentRefreshToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

const userModel = mongoose.model("User", userSchema);
export default userModel;
