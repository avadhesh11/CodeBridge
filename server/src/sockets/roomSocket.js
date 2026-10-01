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

// Tracks active expiry timers per roomID so we never register more than one.
// Without this, every join-room (reconnect, second user joining) creates a new
// setTimeout — all of them fire at expiry and emit session-ended N times.
const roomTimers = {};

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

      // Start timer on first room launch/join if not already active
      if (room.isTimed && room.durationMinutes && !room.expiresAt) {
        room.expiresAt = new Date(Date.now() + room.durationMinutes * 60 * 1000);
        await room.save();
      }

      // Check if room has expired by time
      if (room.isTimed && room.expiresAt && new Date() >= new Date(room.expiresAt)) {
        room.status = "closed";
        await room.save();
      }

      if (room.status === "closed") {
        return socket.emit("error-message", "This room has expired");
      }

      const isPractice = room.mode === "practice";
      const isInterviewer = room.interviewer.toString() === userId;
      const isExistingCandidate = room.candidate?.toString() === userId;
      const isNewCandidate = !room.candidate && !isInterviewer;

      if (!isPractice && !isInterviewer && !isExistingCandidate && !isNewCandidate) {
        return socket.emit("error-message", "Room is full");
      }

      if (!isPractice && isNewCandidate) {
        room.candidate = userId;
        await room.save();
      }

      const role = isPractice ? "practice" : (isInterviewer ? "interviewer" : "candidate");

      socket.join(roomID);
      socket.roomID    = roomID;
      socket.role      = role;
      socket.roomDbId  = room._id;   // stored so chat handler avoids a DB lookup per message
      // receiverId = the other participant (used by chat handler to store receiver)
      socket.receiverId = isInterviewer ? room.candidate?.toString() : room.interviewer?.toString();

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

      socket.emit("joined-successfully", {
        role,
        roomID,
        currentLanguage: room.currentLanguage || "C++",
        mode: room.mode || "interview",
        isTimed: room.isTimed || false,
        durationMinutes: room.durationMinutes,
        expiresAt: room.expiresAt,
        antiCheatLogs: room.antiCheatLogs || [],
        cheatViolationsCount: room.cheatViolationsCount || 0
      });

      // If room is timed, schedule auto-expiration — but only ONCE per room.
      // roomTimers[roomID] guard prevents duplicate timers when users reconnect or
      // a second user joins (both would have previously created their own setTimeout).
      if (room.isTimed && room.expiresAt && !roomTimers[roomID]) {
        const msRemaining = new Date(room.expiresAt).getTime() - Date.now();
        if (msRemaining > 0) {
          roomTimers[roomID] = setTimeout(async () => {
            delete roomTimers[roomID];
            try {
              const r = await roommodel.findOne({ roomID });
              if (r && r.status === "active") {
                r.status = "closed";
                await r.save();
                io.to(roomID).emit("session-ended", { reason: "Time limit expired. Room closed." });
              }
            } catch (e) {
              console.error("Timer expiration error:", e);
            }
          }, msRemaining);
        }
      }

      // Query connected sockets across all instances via Redis adapter
      const socketsInRoom = await io.in(roomID).fetchSockets();
      console.log(`Room ${roomID} now has ${socketsInRoom.length} socket(s) across instances`);

      // Only start WebRTC call for interview mode with 2 participants
      if (!isPractice && socketsInRoom.length >= 2) {
        console.log(`Both users in room ${roomID} — telling joiner (${socket.id}) to start call`);
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

  socket.on("language-change", async ({ language }) => {
    if (!socket.roomID) return;
    await roommodel.updateOne({ roomID: socket.roomID }, { $set: { currentLanguage: language } });
    socket.to(socket.roomID).emit("language-update", { language, sender: socket.user.id });
  });

  socket.on("chat", async ({ message }) => {
    try {
      if (!socket.roomID || !socket.roomDbId) {
        return socket.emit("error-message", "not inside a room");
      }

      // Use socket state set during join-room — no DB round-trip needed.
      await chatModel.create({
        sender:   new mongoose.Types.ObjectId(socket.user.id),
        receiver: socket.receiverId ? new mongoose.Types.ObjectId(socket.receiverId) : undefined,
        roomId:   socket.roomDbId,
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

      if (room.mode !== "practice" && room.candidate?.toString() === socket.user.id) {
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
  // Robust Server-Side Anti-Cheat & Proctoring Engine
  socket.on("anti-cheat-violation", async (data = {}) => {
    try {
      const roomID = socket.roomID;
      if (!roomID) return;

      const eventType = data.event || "SECURITY_VIOLATION";
      const details = data.details || "Candidate triggered a proctoring violation";
      const timestamp = new Date();

      const updatedRoom = await roommodel.findOneAndUpdate(
        { roomID },
        {
          $push: {
            antiCheatLogs: {
              event: eventType,
              details,
              timestamp,
              severity: data.severity || "violation"
            }
          },
          $inc: { cheatViolationsCount: 1 }
        },
        { new: true }
      );

      const totalViolations = updatedRoom?.cheatViolationsCount || 1;
      const violationPayload = {
        event: eventType,
        details,
        timestamp,
        totalViolations
      };

      // Broadcast to interviewer with full audit payload
      socket.to(roomID).emit("candidate-violation-alert", violationPayload);

      // Legacy event backward compatibility
      socket.to(roomID).emit("candidate-left-fullscreen-alert", violationPayload);

      // Send candidate authoritative strike count and warning
      socket.emit("anti-cheat-status", {
        totalViolations,
        lastViolation: { event: eventType, details, timestamp }
      });

      console.log(`[AntiCheat] Room ${roomID} | ${eventType} | Strikes: ${totalViolations}`);
    } catch (err) {
      console.error("[AntiCheat] Error logging violation:", err);
    }
  });

  // Legacy fallback for candidate-left-fullscreen
  socket.on("candidate-left-fullscreen", async () => {
    const roomID = socket.roomID;
    if (!roomID) return;

    try {
      const updatedRoom = await roommodel.findOneAndUpdate(
        { roomID },
        {
          $push: {
            antiCheatLogs: {
              event: "FULLSCREEN_EXIT",
              details: "Candidate exited fullscreen mode",
              timestamp: new Date(),
              severity: "violation"
            }
          },
          $inc: { cheatViolationsCount: 1 }
        },
        { new: true }
      );

      const totalViolations = updatedRoom?.cheatViolationsCount || 1;
      const violationPayload = {
        event: "FULLSCREEN_EXIT",
        details: "Candidate exited fullscreen mode",
        timestamp: new Date(),
        totalViolations
      };

      socket.to(roomID).emit("candidate-violation-alert", violationPayload);
      socket.to(roomID).emit("candidate-left-fullscreen-alert", violationPayload);
      socket.emit("anti-cheat-status", { totalViolations, lastViolation: violationPayload });
    } catch (err) {
      console.error("[AntiCheat] Legacy fullscreen error:", err);
    }
  });

  socket.on("interviewer-warn-candidate", async (data = {}) => {
    const roomID = socket.roomID;
    if (!roomID) return;
    const msg = data?.message || "⚠ Interviewer Warning: Please stay in fullscreen mode for a fair interview.";
    socket.to(roomID).emit("candidate-warning", { message: msg });
  });

  socket.on("interviewer-disqualify-candidate", async (data = {}) => {
    try {
      const roomID = socket.roomID;
      if (!roomID) return;
      const room = await roommodel.findOne({ roomID });
      if (!room || (room.interviewer?.toString() !== socket.user.id && room.mode !== "practice")) return;

      room.status = "closed";
      await room.save();

      io.to(roomID).emit("session-ended", {
        reason: data?.reason || "Interview was terminated by the proctor due to integrity violations."
      });
    } catch (err) {
      console.error("[AntiCheat] Disqualify error:", err);
    }
  });

socket.on("end-session", async () => {
  try {
    const roomID = socket.roomID;
    if (!roomID) return;

    const room = await roommodel.findOne({ roomID });
    if (!room) return;

    if (room.mode === "practice" || room.interviewer.toString() === socket.user.id) {
      room.status = "closed";
      // Archive currentQuestion into questions array if not already there
      if (room.currentQuestion) {
        const qIdStr = room.currentQuestion.toString();
        const alreadyIn = room.questions.some(q => q.toString() === qIdStr);
        if (!alreadyIn) room.questions.push(room.currentQuestion);
      }
      await room.save();

      // Cancel expiry timer — room is already closed, no need to fire later
      if (roomTimers[roomID]) {
        clearTimeout(roomTimers[roomID]);
        delete roomTimers[roomID];
      }

      io.to(roomID).emit("session-ended");
    }
  } catch (error) {
    console.error(error);
  }
});


  socket.on("disconnect", async () => {
    if (!socket.roomID) return;

    const roomID = socket.roomID;

    if (roomSockets[roomID]) {
      roomSockets[roomID] = roomSockets[roomID].filter(id => id !== socket.id);
      if (roomSockets[roomID].length === 0) delete roomSockets[roomID];
    }
  });
}