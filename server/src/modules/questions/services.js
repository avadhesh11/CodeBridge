import quesmodel from "../../models/question.js";

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
      timelimit: data.timelimit || 2,
      qtype: data.Qtype || "private",
      roomId:data.roomId
    });

    return question;
  }


  // GET PUBLIC QUESTIONS
  async getPublicQuestions() {

    return await quesmodel.find({ Qtype: "public" })
      .select("-hiddentcs")
      .sort({ createdAt: -1 });

  }


  // GET PRIVATE QUESTIONS
  async getPrivateQuestions(userId,roomId) {

    return await quesmodel.find({
      qtype: "private",
      roomId:roomId
    }).sort({ createdAt: -1 });

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

}

export default new QuestionService();