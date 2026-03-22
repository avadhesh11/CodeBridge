import mongoose from "mongoose";

const roomSchema=new mongoose.Schema({

roomID:{type:String,required: true,
      unique: true,
      index: true,},
roomName:String,
interviewer:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
 candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
status:{ type: String, enum: ["active","closed"],default:"active"},
activeSockets: [String], 
currentCode: { type: String, default: "" },
createdAt: { type: Date, default: Date.now },
  settings:{
    videoEnabled:{type:Boolean,default:true},
    screenShare:{type:Boolean,default:true},
    chatEnabled:{type:Boolean,default:true},
    codeExecution:{type:Boolean,default:true}
  },
  submissions:[
    {
      user:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
      },
      verdict:String,
      code:String,
      createdAt:{
        type:Date,
        default:Date.now
      }
    }
  ], 
questions:[{type:mongoose.Schema.Types.ObjectId,ref: "Question"}],
currentQuestion: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Question",
  default: null
}
});

const roomModel = mongoose.model("Room", roomSchema);
export default roomModel;

