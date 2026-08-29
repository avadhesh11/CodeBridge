import mongoose from "mongoose";
import quesmodel from "../../models/question.js";
import roomModel from "../../models/room.js";

class QuestionService {
  // CREATE QUESTION
  async createQuestion(data) {
    const question = await quesmodel.create({
      owner: data.owner,
      title: data.title,
      description: data.description,
      constraints: data.constraints,
      sampletcs: data.sampletcs || [],
      hiddentcs: data.hiddentcs || [],
      tag: data.tag || "Easy",
      tags: data.tags || [],
      timelimit: data.timelimit || 2,
      memorylimit: data.memorylimit || 256,
      qtype: data.qtype || "private",
      roomId: data.roomId
    });

    // If roomId provided, attach question to the room document
    if (data.roomId) {
      await roomModel.findOneAndUpdate(
        { roomID: data.roomId },
        {
          $addToSet: { questions: question._id },
          $setOnInsert: { currentQuestion: question._id }
        }
      );
    }

    return question;
  }

  // GET PUBLIC QUESTIONS
  async getPublicQuestions() {
    return await quesmodel.find({ qtype: "public" })
      .select("-hiddentcs")
      .sort({ createdAt: -1 });
  }

  // GET ALL QUESTIONS FOR A USER (My Question Library)
  async getUserQuestions(userId) {
    return await quesmodel.find({ owner: userId })
      .select("-hiddentcs")
      .sort({ createdAt: -1 });
  }

  // GET COMBINED QUESTION BANK (Public + My Questions)
  async getAvailableBank(userId) {
    const [publicQs, userQs] = await Promise.all([
      quesmodel.find({ qtype: "public" }).select("-hiddentcs").sort({ createdAt: -1 }),
      userId ? quesmodel.find({ owner: userId }).select("-hiddentcs").sort({ createdAt: -1 }) : []
    ]);

    return {
      publicQuestions: publicQs,
      myQuestions: userQs
    };
  }

  // GET ALL QUESTIONS IN A ROOM (both room.questions[] and private by roomId)
  async getAllRoomQuestions(roomId) {
    const room = await roomModel.findOne({ roomID: roomId }).populate("questions");
    const roomAttached = (room?.questions || []).filter(q => q && q.title);

    const privateQs = (await quesmodel.find({ roomId })).filter(q => q && q.title);

    // Deduplicate by string _id AND normalized title
    const seenIds = new Set();
    const seenTitles = new Set();
    const merged = [];

    for (const q of [...roomAttached, ...privateQs]) {
      const idStr = q._id.toString();
      const titleNorm = q.title.trim().toLowerCase();

      if (!seenIds.has(idStr) && !seenTitles.has(titleNorm)) {
        seenIds.add(idStr);
        seenTitles.add(titleNorm);
        merged.push(q);
      }
    }

    return merged;
  }

  // ATTACH EXISTING QUESTION(S) TO ROOM
  async addExistingQuestionsToRoom(roomId, questionIds) {
    const room = await roomModel.findOne({ roomID: roomId });
    if (!room) throw new Error("Room not found");

    const objectIds = questionIds.map(id => new mongoose.Types.ObjectId(id));
    await roomModel.findOneAndUpdate(
      { roomID: roomId },
      {
        $addToSet: { questions: { $each: objectIds } },
        ...(room.currentQuestion ? {} : { currentQuestion: objectIds[0] })
      }
    );

    return await this.getAllRoomQuestions(roomId);
  }

  // REMOVE QUESTION FROM ROOM
  async removeQuestionFromRoom(roomId, questionId) {
    const room = await roomModel.findOne({ roomID: roomId });
    if (!room) throw new Error("Room not found");

    await roomModel.findOneAndUpdate(
      { roomID: roomId },
      { $pull: { questions: new mongoose.Types.ObjectId(questionId) } }
    );

    // If it was a room-private question, delete it
    await quesmodel.findOneAndDelete({ _id: questionId, roomId });

    return await this.getAllRoomQuestions(roomId);
  }

  // GET PUBLIC QUESTIONS BY ROOM (Legacy support)
  async getPublicQuestionsByRoom(roomId) {
    return await this.getAllRoomQuestions(roomId);
  }

  // GET PRIVATE QUESTIONS (Legacy support)
  async getPrivateQuestions(userId, roomId) {
    return await this.getAllRoomQuestions(roomId);
  }

  // GET QUESTION BY ID
  async getQuestionById(id) {
    return await quesmodel.findById(id);
  }

  // DELETE QUESTION
  async deleteQuestion(id, userId) {
    return await quesmodel.findOneAndDelete({
      _id: id,
      owner: userId
    });
  }

  // VALIDATE BULK IMPORT
  async validateImportQuestions(rawInput, userId, roomId = null) {
    let questionList = [];

    if (Array.isArray(rawInput)) {
      questionList = rawInput;
    } else if (rawInput && Array.isArray(rawInput.questions)) {
      questionList = rawInput.questions;
    } else if (rawInput && typeof rawInput === "object" && (rawInput.title || rawInput.description)) {
      questionList = [rawInput];
    } else {
      throw new Error("Invalid JSON format. Expected an array of questions or an object with a 'questions' array.");
    }

    if (questionList.length === 0) {
      throw new Error("No questions found in the uploaded file.");
    }

    // Duplicate titles check scoped STRICTLY to the target destination
    let existingTitles = new Set();
    if (mongoose.connection.readyState === 1) {
      if (roomId) {
        // Only check duplicates WITHIN this specific room
        const roomQs = await this.getAllRoomQuestions(roomId);
        existingTitles = new Set(roomQs.map(q => q.title.trim().toLowerCase()));
      } else if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        // When importing into user bank, only check user's own global questions
        const userQs = await quesmodel.find({ owner: userId, roomId: null }).select("title");
        existingTitles = new Set(userQs.map(q => q.title.trim().toLowerCase()));
      }
    }

    const results = [];
    let validCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;

    for (let idx = 0; idx < questionList.length; idx++) {
      const q = questionList[idx];
      const errors = [];
      const index = idx + 1;

      if (!q || typeof q !== "object") {
        results.push({
          index,
          title: `Question #${index}`,
          status: "error",
          errors: ["Invalid item: Expected a question JSON object."]
        });
        errorCount++;
        continue;
      }

      const rawTitle = typeof q.title === "string" ? q.title.trim() : "";
      if (!rawTitle) {
        errors.push("Missing required field: title");
      }

      const difficulty = q.difficulty || q.tag;
      const validDifficulties = ["Easy", "Medium", "Hard"];
      if (!difficulty || !validDifficulties.includes(difficulty)) {
        errors.push(`Invalid or missing difficulty: Must be one of 'Easy', 'Medium', or 'Hard' (got '${difficulty || ""}')`);
      }

      const description = typeof q.description === "string" ? q.description.trim() : "";
      if (!description) {
        errors.push("Missing required field: description");
      }

      let constraintsStr = "";
      if (Array.isArray(q.constraints)) {
        if (q.constraints.length === 0) {
          errors.push("Missing constraints: Array cannot be empty");
        } else {
          constraintsStr = q.constraints.join("\n");
        }
      } else if (typeof q.constraints === "string" && q.constraints.trim()) {
        constraintsStr = q.constraints.trim();
      } else {
        errors.push("Missing or invalid field: constraints must be an array of strings or string");
      }

      let tags = [];
      if (q.tags !== undefined) {
        if (Array.isArray(q.tags)) {
          tags = q.tags.map(t => String(t).trim()).filter(Boolean);
        } else {
          errors.push("Invalid field: tags must be an array of strings if provided");
        }
      }

      const timeLimit = q.timeLimit !== undefined ? q.timeLimit : (q.timelimit !== undefined ? q.timelimit : 2);
      if (typeof timeLimit !== "number" || timeLimit <= 0 || isNaN(timeLimit)) {
        errors.push("Invalid timeLimit: Must be a positive number (seconds)");
      }

      const memoryLimit = q.memoryLimit !== undefined ? q.memoryLimit : (q.memorylimit !== undefined ? q.memorylimit : 256);
      if (typeof memoryLimit !== "number" || memoryLimit <= 0 || isNaN(memoryLimit)) {
        errors.push("Invalid memoryLimit: Must be a positive number (MB)");
      }

      const rawExamples = q.examples || q.sampletcs;
      const sampletcs = [];
      if (!Array.isArray(rawExamples)) {
        errors.push("Missing required field: examples must be an array");
      } else if (rawExamples.length === 0) {
        errors.push("At least one example (sample test case) is required");
      } else {
        for (let eIdx = 0; eIdx < rawExamples.length; eIdx++) {
          const ex = rawExamples[eIdx];
          if (!ex || typeof ex !== "object") {
            errors.push(`Example #${eIdx + 1}: Expected an object with input and output`);
            continue;
          }
          if (ex.input === undefined || ex.input === null || typeof ex.input !== "string") {
            errors.push(`Example #${eIdx + 1}: Missing or invalid 'input' (must be a string)`);
          }
          if (ex.output === undefined || ex.output === null || typeof ex.output !== "string") {
            errors.push(`Example #${eIdx + 1}: Missing or invalid 'output' (must be a string)`);
          }
          sampletcs.push({
            input: String(ex.input ?? ""),
            output: String(ex.output ?? ""),
            explanation: typeof ex.explanation === "string" ? ex.explanation.trim() : ""
          });
        }
      }

      const rawHidden = q.hiddenTestCases || q.hiddentcs;
      const hiddentcs = [];
      if (rawHidden !== undefined) {
        if (!Array.isArray(rawHidden)) {
          errors.push("Invalid hiddenTestCases: Must be an array if provided");
        } else {
          for (let hIdx = 0; hIdx < rawHidden.length; hIdx++) {
            const h = rawHidden[hIdx];
            if (!h || typeof h !== "object") {
              errors.push(`Hidden Test #${hIdx + 1}: Expected an object with input and output`);
              continue;
            }
            if (h.input === undefined || h.input === null || typeof h.input !== "string") {
              errors.push(`Hidden Test #${hIdx + 1}: Missing or invalid 'input' (must be a string)`);
            }
            if (h.output === undefined || h.output === null || typeof h.output !== "string") {
              errors.push(`Hidden Test #${hIdx + 1}: Missing or invalid 'output' (must be a string)`);
            }
            hiddentcs.push({
              input: String(h.input ?? ""),
              output: String(h.output ?? "")
            });
          }
        }
      }

      const isDuplicate = rawTitle && existingTitles.has(rawTitle.toLowerCase());
      if (isDuplicate) {
        duplicateCount++;
      }

      let status = "valid";
      if (errors.length > 0) {
        status = "error";
        errorCount++;
      } else if (isDuplicate) {
        status = "duplicate";
        validCount++;
      } else {
        validCount++;
      }

      const mappedQuestion = errors.length === 0 ? {
        title: rawTitle,
        tag: difficulty,
        tags,
        description,
        constraints: constraintsStr,
        timelimit: timeLimit,
        memorylimit: memoryLimit,
        sampletcs,
        hiddentcs
      } : null;

      results.push({
        index,
        title: rawTitle || `Question #${index}`,
        difficulty: difficulty || "Unknown",
        tags,
        sampleCount: sampletcs.length,
        hiddenCount: hiddentcs.length,
        timeLimit,
        memoryLimit,
        status,
        isDuplicate,
        errors,
        mappedQuestion
      });
    }

    return {
      total: questionList.length,
      validCount,
      errorCount,
      duplicateCount,
      results
    };
  }

  // CONFIRM BULK IMPORT
  async confirmImportQuestions(questionsToImport, userId, roomId = null, allowDuplicates = false, qtype = "private") {
    if (!Array.isArray(questionsToImport) || questionsToImport.length === 0) {
      throw new Error("No valid questions provided for import.");
    }

    // Check existing titles if duplicates are not allowed
    let existingTitles = new Set();
    if (!allowDuplicates && mongoose.connection.readyState === 1) {
      if (roomId) {
        const roomQs = await this.getAllRoomQuestions(roomId);
        existingTitles = new Set(roomQs.map(q => q.title.trim().toLowerCase()));
      } else if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const userQs = await quesmodel.find({ owner: userId, roomId: null }).select("title");
        existingTitles = new Set(userQs.map(q => q.title.trim().toLowerCase()));
      }
    }

    const toInsert = [];
    let skippedCount = 0;

    for (const q of questionsToImport) {
      if (!q.title || !q.description || !q.tag) {
        skippedCount++;
        continue;
      }
      if (!allowDuplicates && existingTitles.has(q.title.trim().toLowerCase())) {
        skippedCount++;
        continue;
      }

      toInsert.push({
        owner: userId,
        roomId: roomId || undefined,
        qtype: qtype || "private",
        title: q.title.trim(),
        tag: q.tag,
        tags: Array.isArray(q.tags) ? q.tags : [],
        description: q.description.trim(),
        constraints: Array.isArray(q.constraints) ? q.constraints.join("\n") : (q.constraints || ""),
        timelimit: q.timelimit || 2,
        memorylimit: q.memorylimit || 256,
        sampletcs: Array.isArray(q.sampletcs) ? q.sampletcs : [],
        hiddentcs: Array.isArray(q.hiddentcs) ? q.hiddentcs : []
      });

      existingTitles.add(q.title.trim().toLowerCase());
    }

    if (toInsert.length === 0) {
      return {
        success: true,
        message: "No new questions were imported (all were skipped as duplicates or invalid).",
        importedCount: 0,
        skippedCount,
        questions: []
      };
    }

    const created = await quesmodel.insertMany(toInsert);

    // If roomId is provided, also attach created questions to the room document
    if (roomId) {
      await roomModel.findOneAndUpdate(
        { roomID: roomId },
        { $addToSet: { questions: { $each: created.map(c => c._id) } } }
      );
    }

    return {
      success: true,
      message: `Successfully imported ${created.length} questions.`,
      importedCount: created.length,
      skippedCount,
      questions: created.map(c => ({
        _id: c._id,
        title: c.title,
        tag: c.tag,
        tags: c.tags,
        sampleCount: c.sampletcs.length,
        hiddenCount: c.hiddentcs.length
      }))
    };
  }

}

export default new QuestionService();