import mongoose, { mongo } from "mongoose";

const questionSchema=new mongoose.Schema({
    owner:{type:mongoose.Schema.Types.ObjectId,ref:"User"},
    qtype:{type:String,default:"private"},
    tag:{type:String,default:"Easy" },
    tags:[{type:String}],
    title:{type:String},
    roomId:{type:String},
    description:{type:String},
    sampletcs:[
        {
            input:{type:String},
            output:{type:String},
            explanation:{type:String,default:""}
        }
    ],
    hiddentcs:[
        {
            input:{type:String},
            output:{type:String}
        }
    ],
    timelimit:{type:Number,default:2},
    memorylimit:{type:Number,default:256},
    constraints:{type:String}
}, { timestamps: true })

const quesmodel=mongoose.model("Question",questionSchema);
export default quesmodel;