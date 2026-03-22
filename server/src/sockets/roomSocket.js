import roommodel from "../models/room.js";
import quesmodel from "../models/question.js";
import chatModel from "../models/chats.js";
import mongoose from "mongoose";

const defaultCode = `#include <bits/stdc++.h>
using namespace std;

int main() {
    // All the best
    return 0;
}`;

const roomSockets = {};

export default function registerRoom(io, socket) {

  socket.on("webrtc-offer", (offer) => {
    socket.to(socket.roomID).emit("webrtc-offer", offer);
  });

  socket.on("webrtc-answer", (answer) => {
    socket.to(socket.roomID).emit("webrtc-answer", answer);
  });

  socket.on("webrtc-ice", (candidate) => {
    socket.to(socket.roomID).emit("webrtc-ice", candidate);
  });

  socket.on("screen-share-start", () => {
    if (!socket.roomID) return;
    socket.to(socket.roomID).emit("screen-share-start");
  });

  socket.on("screen-share-stop", () => {
    if (!socket.roomID) return;
    socket.to(socket.roomID).emit("screen-share-stop");
  });

  socket.on("join-room", async ({ roomID }) => {
    try {
      const userId = socket.user.id;
      const room = await roommodel.findOne({ roomID });

      if (!room) return socket.emit("error-message", "Room does not exist");

      const isInterviewer = room.interviewer.toString() === userId;
      const isExistingCandidate = room.candidate?.toString() === userId;
      const isNewCandidate = !room.candidate && !isInterviewer;

      if (!isInterviewer && !isExistingCandidate && !isNewCandidate) {
        return socket.emit("error-message", "Room is full");
      }

      if (isNewCandidate) {
        room.candidate = userId;
        await room.save();
      }

      const role = isInterviewer ? "interviewer" : "candidate";

      socket.join(roomID);
      socket.roomID = roomID;
      socket.role = role;

      if (!roomSockets[roomID]) roomSockets[roomID] = [];
      roomSockets[roomID] = roomSockets[roomID].filter(id => id !== socket.id);
      roomSockets[roomID].push(socket.id);

      const chats = await chatModel.find({ roomId: room._id }).sort({ createdAt: 1 });
      socket.emit("chat-history", chats);

      if (room.currentQuestion) {
        const question = await quesmodel.findById(room.currentQuestion);
        if (question) {
          socket.emit("question-selected", {
            question: {
              _id: question._id,
              title: question.title,
              tag: question.tag,
              description: question.description,
              sampletcs: question.sampletcs,
              constraints: question.constraints,
              timelimit: question.timelimit
            }
          });
        }
      }

      socket.emit("joined-successfully", { role, roomID });

      const currentSockets = roomSockets[roomID];
      console.log(`Room ${roomID} now has ${currentSockets.length} socket(s):`, currentSockets);

      if (currentSockets.length >= 2) {
        console.log(`Both users in room ${roomID} — telling second joiner (${socket.id}) to start call`);
        socket.emit("start-call");
      }

    } catch (error) {
      console.error(error);
      socket.emit("error-message", "Something went wrong");
    }
  });

  socket.on("code-change", async ({ code }) => {
    if (!socket.roomID) return;
    await roommodel.updateOne({ roomID: socket.roomID }, { $set: { currentCode: code } });
    socket.to(socket.roomID).emit("code-update", { code, sender: socket.user.id });
  });

  socket.on("chat", async ({ message }) => {
    try {
      if (!socket.roomID) return socket.emit("error-message", "not inside a room");

      const room = await roommodel.findOne({ roomID: socket.roomID });
      if (!room) return socket.emit("error-message", "Room not found");

      const isInterviewer = room.interviewer.toString() === socket.user.id;
      const receiverId = isInterviewer ? room.candidate : room.interviewer;

      await chatModel.create({
        sender: new mongoose.Types.ObjectId(socket.user.id),
        receiver: new mongoose.Types.ObjectId(receiverId),
        roomId: room._id,
        message
      });

      io.to(socket.roomID).emit("chat", { sender: socket.user.id, message });

    } catch (error) {
      console.error(error);
      socket.emit("error-message", "Something went wrong");
    }
  });

  socket.on("select-question", async ({ questionId }) => {
    try {
      if (!socket.roomID) return socket.emit("error-message", "not inside a room");

      const room = await roommodel.findOne({ roomID: socket.roomID });
      if (!room) return socket.emit("error-message", "Room not found");

      if (room.candidate?.toString() === socket.user.id) {
        return socket.emit("error-message", "candidate cannot select question");
      }

      const question = await quesmodel.findById(questionId);
      if (!question) return socket.emit("error-message", "Question not found");

      room.currentQuestion = questionId;
      room.currentCode = "";
      await room.save();

      io.to(socket.roomID).emit("code-update", { code: defaultCode, sender: "system" });

      io.to(socket.roomID).emit("question-selected", {
        question: {
          _id: question._id,
          tag: question.tag,
          title: question.title,
          description: question.description,
          sampletcs: question.sampletcs,
          constraints: question.constraints,
          timelimit: question.timelimit
        }
      });

    } catch (error) {
      console.error(error);
      socket.emit("error-message", "Something went wrong");
    }
  });

  socket.on("disconnect", async () => {
    if (!socket.roomID) return;

    if (roomSockets[socket.roomID]) {
      roomSockets[socket.roomID] = roomSockets[socket.roomID].filter(id => id !== socket.id);
      if (roomSockets[socket.roomID].length === 0) delete roomSockets[socket.roomID];
    }

    const room = await roommodel.findOne({ roomID: socket.roomID });
    if (!room) return;

    if (socket.role === "candidate") {
      room.candidate = null;
      await room.save();
    }

    if (socket.role === "interviewer") {
      room.status = "closed";
      await room.save();
    }
  });
}