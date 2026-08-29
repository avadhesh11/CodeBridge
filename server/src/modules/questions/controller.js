import QuestionService from "./services.js";
import apiError from "../../utils/apiError.js";

class QuestionController {

  // CREATE QUESTION
  addQuestion = async (req, res, next) => {
    try {
      const {
        title,
        description,
        constraints,
        sampletcs,
        hiddentcs,
        tag,
        timelimit,
        qtype
      } = req.body;
     const {roomId}=req.params;
    if (!title || !description || !constraints || !tag || qtype === "private" && (!sampletcs || !hiddentcs) || qtype === "public" && (!sampletcs)) {
        throw new apiError(400, "Title and description required");
      }

      const owner = req.user._id;

      const question = await QuestionService.createQuestion({
        owner,
        title,
        description,
        constraints,
        sampletcs,
        hiddentcs,
        tag,
        timelimit,
        qtype,
        roomId

      });

      return res.status(201).json({
        success: true,
        message: "Question created",
        question
      });

    } catch (error) {
      next(error);
    }
  };


  // FETCH PUBLIC QUESTIONS
  fetchPublicQuestions = async (req, res, next) => {
    try {
      const questions = await QuestionService.getPublicQuestions();
      return res.status(200).json({
        success: true,
        message: "Public questions fetched",
        questions
      });
    } catch (error) {
      next(error);
    }
  };

  // FETCH USER SAVED QUESTIONS (My Questions Library)
  fetchUserQuestions = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const questions = await QuestionService.getUserQuestions(userId);
      return res.status(200).json({
        success: true,
        message: "User questions fetched",
        questions
      });
    } catch (error) {
      next(error);
    }
  };

  // FETCH COMBINED QUESTION BANK (Public + User Library)
  fetchAvailableBank = async (req, res, next) => {
    try {
      const userId = req.user?._id;
      const data = await QuestionService.getAvailableBank(userId);
      return res.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      next(error);
    }
  };

  // FETCH ALL QUESTIONS FOR A ROOM
  fetchAllRoomQuestions = async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const questions = await QuestionService.getAllRoomQuestions(roomId);
      return res.status(200).json({
        success: true,
        questions
      });
    } catch (error) {
      next(error);
    }
  };

  // ATTACH EXISTING QUESTIONS TO A ROOM
  attachQuestionsToRoom = async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const { questionIds } = req.body;

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        throw new apiError(400, "Please provide an array of question IDs to attach.");
      }

      const questions = await QuestionService.addExistingQuestionsToRoom(roomId, questionIds);
      return res.status(200).json({
        success: true,
        message: "Questions added to room",
        questions
      });
    } catch (error) {
      next(error);
    }
  };

  // REMOVE QUESTION FROM A ROOM
  removeQuestionFromRoom = async (req, res, next) => {
    try {
      const { roomId, questionId } = req.params;
      const questions = await QuestionService.removeQuestionFromRoom(roomId, questionId);
      return res.status(200).json({
        success: true,
        message: "Question removed from room",
        questions
      });
    } catch (error) {
      next(error);
    }
  };

  // FETCH PUBLIC QUESTIONS BY ROOM (Legacy support)
  fetchPublicQuestionsByRoom = async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const questions = await QuestionService.getAllRoomQuestions(roomId);
      return res.status(200).json({
        success: true,
        message: "Public questions fetched for room",
        questions
      });
    } catch (error) {
      next(error);
    }
  };

  // FETCH PRIVATE QUESTIONS (Legacy support)
  fetchPrivateQuestions = async (req, res, next) => {
    try {
      const { roomId } = req.params;
      const questions = await QuestionService.getAllRoomQuestions(roomId);
      return res.status(200).json({
        success: true,
        message: "Room questions fetched",
        questions
      });
    } catch (error) {
      next(error);
    }
  };


  // GET SINGLE QUESTION
  getQuestion = async (req, res, next) => {
    try {

      const { id } = req.params;

      const question = await QuestionService.getQuestionById(id);

      if (!question) {
        throw new apiError(404, "Question not found");
      }

      return res.status(200).json({
        success: true,
        question
      });

    } catch (error) {
      next(error);
    }
  };


  // DELETE QUESTION
  deleteQuestion = async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const deleted = await QuestionService.deleteQuestion(id, userId);

      if (!deleted) {
        throw new apiError(404, "Question not found or unauthorized");
      }

      return res.status(200).json({
        success: true,
        message: "Question deleted"
      });

    } catch (error) {
      next(error);
    }
  };

  // PREVIEW BULK IMPORT
  previewImport = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { roomId } = req.query;
      const data = req.body;

      if (!data) {
        throw new apiError(400, "No JSON payload provided for import.");
      }

      const previewData = await QuestionService.validateImportQuestions(data, userId, roomId);

      return res.status(200).json({
        success: true,
        data: previewData
      });
    } catch (error) {
      next(error);
    }
  };

  // CONFIRM BULK IMPORT
  confirmImport = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { questions, allowDuplicates, roomId, qtype } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new apiError(400, "No questions array provided for confirmation.");
      }

      const result = await QuestionService.confirmImportQuestions(
        questions,
        userId,
        roomId || req.query.roomId,
        Boolean(allowDuplicates),
        qtype || "private"
      );

      return res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

}

export default new QuestionController();