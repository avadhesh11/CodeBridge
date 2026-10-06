import roomModel from "../../models/room.js";
import { nanoid } from "nanoid";
import questionModel from "../../models/question.js";
import submissionModel from "../../models/submission.js";
import { executionQueue, queueEvents } from "../../services/queueService.js";

class roomServices {
  newRoom = async (userid, name, questionIds = [], mode = "interview", isTimed = false, durationMinutes = null) => {
    const roomID = nanoid(8);
    const roomData = {
      roomID,
      roomName: name,
      interviewer: userid,
      status: "active",
      mode: mode === "practice" ? "practice" : "interview",
      isTimed: Boolean(isTimed),
      durationMinutes: isTimed && durationMinutes ? Number(durationMinutes) : null,
      expiresAt: null
    };
    if (questionIds.length > 0) {
      roomData.questions = questionIds;
      roomData.currentQuestion = questionIds[0];
    }
    const room = await roomModel.create(roomData);
    await room.save();
    return roomID;
  };

  async getRoom(roomID) {
    const room = await roomModel
      .findOne({ roomID })
      .populate("interviewer", "name email")
      .populate("candidate", "name email")
      .populate("questions")
      .populate("submissions.question");

    if (room && room.status === "active" && room.isTimed && room.expiresAt && new Date() >= new Date(room.expiresAt)) {
      room.status = "closed";
      await room.save();
    }

    return room;
  }

  async getRoomQuestions(roomID) {
    const room = await roomModel.findOne({ roomID }).populate("questions");
    if (!room) throw new Error("Room not found");
    return room.questions;
  }

  async getAllRoomQuestionsForManager(roomID) {
    const room = await roomModel.findOne({ roomID }).populate("questions");
    if (!room) throw new Error("Room not found");

    const publicQs = (room.questions || []).map((q) => ({
      ...q.toObject(),
      _source: "public"
    }));

    const privateQs = await questionModel.find({ qtype: "private", roomId: roomID });
    const privateArr = privateQs.map((q) => ({
      ...q.toObject(),
      _source: "private"
    }));

    return [...privateArr, ...publicQs];
  }

  /**
   * Submits code for execution.
   * Creates a persistent Submission record in QUEUED state, then enqueues to BullMQ.
   * If isAsync is true, immediately returns submission tracking info.
   * If isAsync is false (default), waits for the execution worker result for full backward compatibility.
   */
  runCode = async (
    code,
    questionId,
    type = "sample",
    roomID = null,
    userId = null,
    language = "C++",
    isAsync = false
  ) => {
    if (!code) {
      return { verdict: "INVALID", error: "Code required" };
    }

    const question = await questionModel.findById(questionId);
    if (!question) {
      return { verdict: "INVALID", error: "Question not found" };
    }

    const submissionId = nanoid(14);
    const testcases = type === "sample" ? question.sampletcs : question.hiddentcs;
    const timelimit = question.timelimit || 2;

    // 1. Create persistent submission record in MongoDB
    let submissionRecord;
    try {
      submissionRecord = await submissionModel.create({
        submissionId,
        userId,
        roomID,
        questionId,
        type,
        language: language || "C++",
        code,
        status: "QUEUED",
        verdict: "PENDING"
      });
    } catch (dbErr) {
      console.error("Failed to persist initial submission record:", dbErr.message);
    }

    // 2. Enqueue job to BullMQ
    let job;
    try {
      job = await executionQueue.add(
        "execute",
        {
          submissionId,
          questionId,
          testcases,
          code,
          language: language || "C++",
          timelimit,
          roomID,
          userId,
          type
        },
        {
          attempts: 1
        }
      );
    } catch (queueErr) {
      console.error("🔥 BullMQ enqueueing failure:", queueErr.message);
      if (submissionRecord) {
        await submissionModel.updateOne(
          { submissionId },
          {
            $set: {
              status: "INTERNAL_ERROR",
              verdict: "ERROR",
              error: `Queue insertion failure: ${queueErr.message}`
            }
          }
        );
      }
      return { verdict: "ERROR", error: "Service temporarily unavailable. Could not queue job." };
    }

    // 3. Return immediately if asynchronous mode requested
    if (isAsync) {
      return {
        submissionId,
        status: "QUEUED",
        verdict: "PENDING",
        message: "Submission enqueued successfully"
      };
    }

    // 4. Synchronous backward-compatibility wait
    try {
      const result = await job.waitUntilFinished(queueEvents, 90_000);
      return {
        ...result,
        submissionId
      };
    } catch (err) {
      console.error("🔥 Execution timeout or error waiting for worker:", err.message);
      return {
        submissionId,
        verdict: "ERROR",
        error: err.message || "Execution wait timed out"
      };
    }
  };

  /**
   * Retrieves current status and verdict for a submission.
   */
  async getSubmissionStatus(submissionId, userId) {
    const submission = await submissionModel
      .findOne({ submissionId })
      .populate("questionId", "title tag timelimit");

    if (!submission) return null;

    // Authorization: User must be submission owner or an interviewer in the room
    if (userId && submission.userId.toString() !== userId.toString()) {
      if (submission.roomID) {
        const room = await roomModel.findOne({ roomID: submission.roomID });
        const isInterviewer = room?.interviewer?.toString() === userId.toString();
        if (!isInterviewer) {
          throw new Error("Unauthorized to view this submission");
        }
      } else {
        throw new Error("Unauthorized to view this submission");
      }
    }

    return submission;
  }

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
        $or: [{ interviewer: userid }, { candidate: userid }]
      })
      .populate("interviewer", "name email")
      .populate("candidate", "name email")
      .populate("currentQuestion")
      .populate("questions")
      .populate("submissions.question")
      .sort({ createdAt: -1 });
  }
}

export default new roomServices();