import mongoose, { mongo } from "mongoose";

const questionSchema=new mongoose.Schema({
    owner:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    qtype:{type:String,default:"private"},
    tag:{type:String,default:"Easy" },
    title:{type:String},
    roomId:{type:String},
    description:{type:String},
    sampletcs:[
        {
            input:{type:String},
            output:{type:String}
        }
    ],
    hiddentcs:[
        {
            input:{type:String},
            output:{type:String}
        }
    ],
    timelimit:{type:Number,default:2},
    constraints:{type:String}
})

const quesmodel=mongoose.model("Questions",questionSchema);
export default quesmodel;