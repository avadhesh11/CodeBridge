import roomServices from "./services.js";
import apiError from "../../utils/apiError.js";
class roomController{
createRoom=async(req,res,next)=>{
try {
    const userid=req.user._id;
    const {name, questionId, questionIds}=req.body;
    // Support both single questionId and array questionIds
    const ids = questionIds && questionIds.length > 0 ? questionIds : (questionId ? [questionId] : []);
    const room=await roomServices.newRoom(userid, name, ids);
    return res.status(201).json({
       success: true,
      message: "Room created successfully",
     roomID: room
    })
} catch (error) {
    next(error);
}
}
  getRoom = async (req, res, next) => {
    try {

      const { roomID } = req.params;

      const room = await roomServices.getRoom(roomID);

      if (!room) throw new apiError(404, "Room not found");

      if (room.status === "closed") {
        throw new apiError(410, "This interview room has expired and is no longer accessible.");
      }

      return res.status(200).json({
        success: true,
        room
      });

    } catch (error) {
      next(error);
    }
  };
 closeRoom = async (req, res, next) => {
    try {

      const { roomID } = req.params;

      await roomServices.closeRoom(roomID);

      return res.status(200).json({
        success: true,
        message: "Room closed"
      });

    } catch (error) {
      next(error);
    }
  };

  getUserRooms = async (req, res, next) => {
    try {
      const userid = req.user._id;
      const rooms = await roomServices.getUserRooms(userid);
      return res.status(200).json({
        success: true,
        rooms
      });
    } catch (error) {
      next(error);
    }
  };


  getQuestions = async (req, res, next) => {
    try {

      const { roomID } = req.params;

      const questions = await roomServices.getRoomQuestions(roomID);

      return res.status(200).json({
        success: true,
        questions
      });

    } catch (error) {
      next(error);
    }
  };

addQuestion=async(req,res)=>{
  try {
     const {roomID}=req.params;
    const {questions}=req.body;
    
  } catch (error) {
    
  }
}
runCode = async (req, res, next) => {
  try {
    const { code, questionId, type, roomID, language } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required"
      });
    }

    const result = await roomServices.runCode(code, questionId, type, roomID, req.user._id, language);
  
    return res.status(200).json({
      success: true,
      ...result   // 🔥 VERY IMPORTANT
    });

  } catch (error) {
    next(error);
  }
};
};
export default new roomController();
