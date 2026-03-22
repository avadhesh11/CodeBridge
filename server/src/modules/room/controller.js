import roomServices from "./services.js";
class roomController{
createRoom=async(req,res,next)=>{
try {
    const userid=req.user._id;
    const {name}=req.body;
    const room=await roomServices.newRoom(userid,name);
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

      const room = await RoomService.getRoom(roomID);

      if (!room) throw new apiError(404, "Room not found");

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

      await RoomService.closeRoom(roomID);

      return res.status(200).json({
        success: true,
        message: "Room closed"
      });

    } catch (error) {
      next(error);
    }
  };


  getQuestions = async (req, res, next) => {
    try {

      const { roomID } = req.params;

      const questions = await RoomService.getRoomQuestions(roomID);

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
    const { code, questionId } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: "Code is required"
      });
    }

    const result = await roomServices.runCode(code, questionId);
  
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
