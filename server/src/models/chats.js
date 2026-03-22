import mongoose, { Mongoose } from "mongoose";

const chatSchema=new mongoose.Schema({
sender:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
receiver:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
roomId:{type:mongoose.Schema.Types.ObjectId,ref:"Room"},
message:{type:String},

},{ timestamps: true })

const chatModel=new mongoose.model("Chats",chatSchema);
export default chatModel;