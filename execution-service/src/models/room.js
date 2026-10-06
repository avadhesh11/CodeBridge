import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
  roomID: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  submissions: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      },
      question: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Question"
      },
      verdict: String,
      code: String,
      language: {
        type: String,
        default: "C++"
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ]
});

const roomModel = mongoose.model("Room", roomSchema);
export default roomModel;
