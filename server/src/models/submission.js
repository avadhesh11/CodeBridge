import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    submissionId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    roomID: {
      type: String,
      index: true,
      default: null
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true
    },
    type: {
      type: String,
      enum: ["sample", "hidden"],
      default: "sample"
    },
    language: {
      type: String,
      default: "C++"
    },
    code: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: [
        "QUEUED",
        "RUNNING",
        "ACCEPTED",
        "WRONG_ANSWER",
        "TIME_LIMIT_EXCEEDED",
        "COMPILATION_ERROR",
        "RUNTIME_ERROR",
        "INTERNAL_ERROR"
      ],
      default: "QUEUED",
      index: true
    },
    verdict: {
      type: String,
      enum: ["AC", "WA", "TLE", "RE", "CE", "ERROR", "PENDING"],
      default: "PENDING"
    },
    results: [
      {
        input: { type: String, default: "" },
        expected: { type: String, default: "" },
        actual: { type: String, default: "" },
        status: { type: String, default: "" }
      }
    ],
    error: {
      type: String,
      default: null
    },
    startedAt: {
      type: Date,
      default: null
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const submissionModel = mongoose.model("Submission", submissionSchema);
export default submissionModel;
