import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { spawn } from "child_process";
import pLimit from "p-limit";
import { Worker } from "bullmq";
import { connection } from "./queueService.js";

const limit = pLimit(5);

const configs = {
  "C++": {
    filename: "main.cpp",
    image: "frolvlad/alpine-gxx:latest",
    compileCmd: "g++ main.cpp -o main",
    runCmd: "./main"
  },
  "Python": {
    filename: "main.py",
    image: "python:3.9-slim",
    compileCmd: null,
    runCmd: "python -B main.py"
  },
  "Java": {
    filename: "Main.java",
    image: "openjdk:17-jdk-slim",
    compileCmd: "javac Main.java",
    runCmd: "java Main"
  },
  "JavaScript": {
    filename: "main.js",
    image: "node:18-slim",
    compileCmd: null,
    runCmd: "node main.js"
  }
};

// Convert Windows paths (E:\foo\bar) to Docker-compatible paths (/e/foo/bar)
const toDockerPath = (p) => {
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
};

const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB limit to prevent output flooding and memory freeze

const runDocker = (args, input = "", timeoutMs = 15000) => {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", args);

    let stdout = "";
    let stderr = "";
    let isSettled = false;

    // Hard fallback timeout to kill runaway processes and containers
    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          proc.kill("SIGKILL");
        } catch {}
        resolve({ code: 124, stdout, stderr: "Time Limit Exceeded" });
      }
    }, timeoutMs);

    proc.stdout.on("data", (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        stdout += data.toString();
      }
    });

    proc.stderr.on("data", (data) => {
      if (stderr.length < MAX_OUTPUT_SIZE) {
        stderr += data.toString();
      }
    });

    proc.on("close", (code) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        resolve({ code, stdout, stderr });
      }
    });

    proc.on("error", (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(err);
      }
    });

    if (input) {
      try {
        proc.stdin.write(input);
        proc.stdin.end();
      } catch {}
    } else {
      try {
        proc.stdin.end();
      } catch {}
    }
  });
};

// ---------------- NORMALIZER ----------------
const normalize = (str) =>
  str.trim().replace(/\s+/g, " ");

// ---------------- COMPILE ----------------
const compileCode = async (tempDir, langConfig) => {
  if (!langConfig.compileCmd) return { code: 0 };
  
  const tempId = path.basename(tempDir);
  const volumeName = process.env.TEMP_VOLUME_NAME;
  
  const dockerArgs = [
    "run",
    "--rm",
    "--log-driver=none"
  ];
  
  if (volumeName) {
    dockerArgs.push("-v", `${volumeName}:/app`, "-w", `/app/${tempId}`);
  } else {
    const dockerDir = toDockerPath(tempDir);
    dockerArgs.push("-v", `${dockerDir}:/app`, "-w", "/app");
  }
  
  dockerArgs.push(
    langConfig.image,
    "sh",
    "-c",
    langConfig.compileCmd
  );
  
  return runDocker(dockerArgs, "", 15000);
};

const runSingleTest = async (tc, dockerPath, langConfig, timelimit) => {
  const tempId = path.basename(dockerPath);
  const volumeName = process.env.TEMP_VOLUME_NAME;
  const sec = Math.max(1, parseInt(timelimit, 10) || 2);
  
  const dockerArgs = [
    "run",
    "--rm",
    "--log-driver=none",
    "--memory=256m",
    "--cpus=1",
    "--pids-limit=64",
    "--network=none",
    "--read-only",
    "--tmpfs",
    "/tmp",
    "-i"
  ];

  if (volumeName) {
    dockerArgs.push("-v", `${volumeName}:/app`, "-w", `/app/${tempId}`);
  } else {
    const dockerDir = toDockerPath(dockerPath);
    dockerArgs.push("-v", `${dockerDir}:/app`, "-w", "/app");
  }

  dockerArgs.push(
    langConfig.image,
    "sh",
    "-c",
    `timeout -s 9 ${sec} ${langConfig.runCmd}`
  );

  const maxWaitMs = (sec + 3) * 1000;
  const result = await runDocker(dockerArgs, tc.input, maxWaitMs);

  // ⏱️ Timeout / Killed by signal
  if (
    result.code === 124 ||
    result.code === 137 ||
    result.code === 143 ||
    result.stderr?.includes("Time Limit Exceeded")
  ) {
    return {
      verdict: "TLE",
      input: tc.input
    };
  }

  if (result.code !== 0) {
    return {
      verdict: "RE",
      error: result.stderr,
      input: tc.input
    };
  }

  const actual = normalize(result.stdout);
  const expected = normalize(tc.output);

  return {
    input: tc.input,
    expected,
    actual,
    status: actual === expected ? "PASS" : "WA"
  };
};

// ---------------- PARALLEL EVALUATION ----------------
const evaluateParallel = async (testcases, dockerPath, langConfig, timelimit) => {
  const promises = testcases.map((tc) =>
    limit(() => runSingleTest(tc, dockerPath, langConfig, timelimit))
  );

  const results = await Promise.all(promises);

  let verdict = "AC";

  for (const res of results) {
    if (res.verdict === "TLE") return { verdict: "TLE", results: [] };
    if (res.verdict === "RE") return { verdict: "RE", error: res.error };

    if (res.status === "WA") {
      verdict = "WA";
    }
  }

  return { verdict, results };
};

// ---------------- MAIN JUDGE ----------------
const runJudge = async (testcases, code, language = "C++", timelimit = 2) => {
  const langConfig = configs[language] || configs["C++"];
  const tempId = uuid();
  const tempDir = path.join(process.cwd(), "temp", tempId);

  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, langConfig.filename);
  await fs.writeFile(filePath, code);

  try {
    // 🔨 Compile
    const compileResult = await compileCode(tempDir, langConfig);

    if (compileResult.code !== 0) {
      return {
        verdict: "CE",
        error: compileResult.stderr
      };
    }

    // ⚡ Parallel Execution
    return await evaluateParallel(testcases, tempDir, langConfig, timelimit);

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

// ---------------- EXPORTS ----------------
export const runSample = async ({ testcases, timelimit }, code, language = "C++") => {
  if (!code || code.length > 50000) {
    return { verdict: "ERROR", error: "Invalid or too large code" };
  }
  return runJudge(testcases, code, language, timelimit);
};

export const runHidden = async ({ testcases, timelimit }, code, language = "C++") => {
  if (!code || code.length > 50000) {
    return { verdict: "ERROR", error: "Invalid or too large code" };
  }
  return runJudge(testcases, code, language, timelimit);
};

// ---------------- BULLMQ WORKER ----------------
export const executionWorker = new Worker(
  "executionQueue",
  async (job) => {
    const { testcases, code, language, timelimit } = job.data;
    try {
      return await runJudge(testcases, code, language, timelimit);
    } catch (err) {
      console.error("🔥 Worker execution crashed:", err);
      throw err;
    }
  },
  {
    connection,
    concurrency: 5
  }
);

executionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

executionWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});