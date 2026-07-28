import roomModel from "../../models/room.js";
import { nanoid } from "nanoid";
import questionModel from "../../models/question.js";
import { executionQueue, queueEvents } from "../../services/queueService.js";

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
newRoom=async(userid, name, questionIds=[])=>{
    const roomID=nanoid(8);
    const roomData = {
        roomID,
        roomName: name,
        interviewer: userid,
        status: "active"
    };
    if (questionIds.length > 0) {
        roomData.questions = questionIds;
        roomData.currentQuestion = questionIds[0]; // first question shown by default
    }
    const room = await roomModel.create(roomData);
    await room.save();
    return roomID;
}
 async getRoom(roomID) {

    return await roomModel
      .findOne({ roomID })
      .populate("interviewer", "name email")
      .populate("candidate", "name email")
      .populate("questions")
      .populate("submissions.question");

  }

 async getRoomQuestions(roomID) {

    const room = await roomModel
      .findOne({ roomID })
      .populate("questions");

    if (!room) throw new Error("Room not found");

    return room.questions;
  }

  // Get ALL questions for a room: public (from room.questions[]) + private (by roomId field)
  async getAllRoomQuestionsForManager(roomID) {
    const room = await roomModel
      .findOne({ roomID })
      .populate("questions");

    if (!room) throw new Error("Room not found");

    // Public questions already stored in room.questions[]
    const publicQs = (room.questions || []).map(q => ({
      ...q.toObject(),
      _source: "public"
    }));

    // Private questions created specifically for this room
    const privateQs = await questionModel.find({ qtype: "private", roomId: roomID });
    const privateArr = privateQs.map(q => ({
      ...q.toObject(),
      _source: "private"
    }));

    return [...privateArr, ...publicQs];
  }

runCode = async (code, questionId, type = "sample", roomID = null, userId = null, language = "C++") => {
  if (!code) {
    return { verdict: "INVALID", error: "Code required" };
  }

  const question = await questionModel.findById(questionId);

  if (!question) {
    return { verdict: "INVALID", error: "Question not found" };
  }

  try {
    const testcases = type === "sample" ? question.sampletcs : question.hiddentcs;
    const timelimit = question.timelimit || 2;

    // Enqueue the execution job
    const job = await executionQueue.add("execute", {
      testcases,
      code,
      language: language || "C++",
      timelimit
    });

    // Wait for worker to finish processing the job
    const result = await job.waitUntilFinished(queueEvents);

    if (type === "hidden" && roomID && userId) {
      const room = await roomModel.findOne({ roomID });
      if (room) {
        room.submissions.push({
          user: userId,
          question: questionId,
          verdict: result.verdict,
          code,
          language: language || "C++",
          createdAt: new Date()
        });
        await room.save();
      }
    }

    return result;
  } catch (err) {
    console.error("🔥 EXECUTION CRASH/QUEUE ERROR:", err);
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

  async getUserRooms(userid) {
    return await roomModel
      .find({
        $or: [
          { interviewer: userid },
          { candidate: userid }
        ]
      })
      .populate("interviewer", "name email")
      .populate("candidate", "name email")
      .populate("currentQuestion")
      .populate("questions")
      .populate("submissions.question")
      .sort({ createdAt: -1 });
  }


};

export default new roomServices();