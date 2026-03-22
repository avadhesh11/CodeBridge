import fs from "fs/promises"; import path from "path"; import { v4 as uuid } from "uuid"; import { spawn } from "child_process";
const runDocker = (args, input = "") => {
  return new Promise((resolve, reject) => {
    const process = spawn("docker", args);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    process.on("error", (err) => {
      reject(err);
    });

    if (input) {
      process.stdin.write(input);
      process.stdin.end();
    }
  });
};
const evaluate = async (testcases, dockerPath, timelimit) => {
  let finalVerdict = "AC";
  const results = [];

  for (const tc of testcases) {

    const runResult = await runDocker(
      [
        "run",
        "--rm",
        "--memory=256m",
        "--cpus=1",
        "--pids-limit=64",
        "--network=none",
        "-i",
        "-v",
        `${dockerPath}:/app`,
        "-w",
        "/app",
        "cpp-runner",
        "timeout",
        `${timelimit}s`,
        "./main"
      ],
      tc.input
    );

    if (runResult.code === 124) {
      return { verdict: "TLE", results: [] };
    }

    if (runResult.code !== 0) {
      return { verdict: "RE", results: [] };
    }

    const actual = runResult.stdout.trim();
    const expected = tc.output.trim();

    const status = actual === expected ? "PASS" : "WA";

    if (status === "WA") {
      finalVerdict = "WA";
    }

    results.push({
      input: tc.input,
      expected,
      actual,
      status
    });

    if (finalVerdict === "WA") break;
  }

  return {
    verdict: finalVerdict,
    results
  };
};

const runJudge = async (testcases, code, timelimit) => {
  const tempId = uuid();
  const tempDir = path.join(process.cwd(), "temp", tempId);

  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, "main.cpp");
  await fs.writeFile(filePath, code);

  try {
    // Compile
    const compileResult = await runDocker([
      "run",
      "--rm",
      "-v",
      `${tempDir}:/app`,
      "-w",
      "/app",
      "cpp-runner",
      "g++",
      "main.cpp",
      "-o",
      "main"
    ]);

    if (compileResult.code !== 0) {
      return {
        verdict: "CE",
        error: compileResult.stderr
      };
    }

    // Evaluate
    return await evaluate(testcases, tempDir,timelimit);

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

export const runSample = async ({ testcases, timelimit }, code) => {
  return runJudge(testcases, code, timelimit);
};
export const runHidden = async ({ testcases, timelimit }, code) => {
  return runJudge(testcases, code, timelimit);
};