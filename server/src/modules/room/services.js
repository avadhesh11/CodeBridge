import roomModel from "../../models/room.js";
import { nanoid } from "nanoid";
import questionModel from "../../models/question.js";
import { runSample, runHidden } from "../../services/executionService.js";

// const question = {
//   format:"multiple",
//   sampleTestcases: [
//     { input: "1 1", output: "2" },
//     { input: "2 3", output: "5" },
//     { input: "5 7", output: "12" },
//     { input: "10 20", output: "30" },
//     // Sequential increasing
//     { input: "11 22", output: "33" },
//     { input: "12 24", output: "36" },
//     // Edge values
//     { input: "0 0", output: "0" },
//     { input: "0 5", output: "5" },
//     { input: "5 0", output: "5" },
//     { input: "-1 1", output: "0" },
//     { input: "-5 -5", output: "-10" },
//     { input: "-10 20", output: "10" },
//     { input: "20 -10", output: "10" },

//     // Mixed ranges (auto-generated pattern)
//   ]
// };

class roomServices{
newRoom=async(userid,name)=>{
    const roomID=nanoid(8);
    const room=await roomModel.create({
        roomID,
        roomName:name,
        interviewer:userid,
        status:"active"
    });
    await room.save();
    return roomID;
}
 async getRoom(roomID) {

    return await roomModel
      .findOne({ roomID })
      .populate("interviewer", "name email")
      .populate("candidate", "name email")
      .populate("questions");

  }

 async getRoomQuestions(roomID) {

    const room = await roomModel
      .findOne({ roomID })
      .populate("questions");

    if (!room) throw new Error("Room not found");

    return room.questions;
  }

runCode = async (code,questionId, type = "sample") => {
  if (!code) {
    return { verdict: "INVALID", error: "Code required" };
  }


  const question = await questionModel.findById(questionId);

  if (!question) {
  
    return { verdict: "INVALID", error: "Question not found" };
  }

  try {
    if (type === "sample") {
 
   const result= await runSample({
        testcases: question.sampletcs,
        timelimit: question.timelimit || 2
      }, code);

      return result;
    }

    return await runHidden({
      testcases: question.hiddentcs,
      timelimit: question.timelimit
    }, code);


  } catch (err) {
  console.error("🔥 EXECUTION CRASH:", err);
  return { verdict: "ERROR", error: err.message };

  }
};
  async closeRoom(roomID) {

    const room = await roomModel.findOne({ roomID });

    if (!room) throw new Error("Room not found");

    room.status = "closed";

    await room.save();

    return room;
  }


};

export default new roomServices();