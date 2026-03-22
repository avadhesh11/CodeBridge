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
      if (!title || !description) {
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


  // FETCH PRIVATE QUESTIONS (created by user)
  fetchPrivateQuestions = async (req, res, next) => {
    try {

      const userId = req.user._id;
      const {roomId}=req.params;
   
      const questions = await QuestionService.getPrivateQuestions(userId,roomId);

      return res.status(200).json({
        success: true,
        message: "Private questions fetched",
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

}

export default new QuestionController();