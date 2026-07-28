import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, },
  email: { type: String, required: true, unique: true },
  password: { type: String },
  githubId: { type: String, unique: true, sparse: true },
  currentRefreshToken: { type: String, default: null },
  bio: { type: String, default: "" },
  company: { type: String, default: "" },
  location: { type: String, default: "" },
  skills: { type: [String], default: [] },
  role: { type: String, default: "interviewer" },
  avatar: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now }
});

const userModel = mongoose.model("User", userSchema);
export default userModel;
