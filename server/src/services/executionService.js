import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { spawn } from "child_process";
import pLimit from "p-limit";

const limit = pLimit(5);

// Convert Windows paths (E:\foo\bar) to Docker-compatible paths (/e/foo/bar)
const toDockerPath = (p) => {
  // On Windows: C:\foo\bar -> /c/foo/bar
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
};

const runDocker = (args, input = "") => {
  return new Promise((resolve, reject) => {
    const proc = spawn("docker", args);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });

    proc.on("error", (err) => reject(err));

    if (input) {
      proc.stdin.write(input);
      proc.stdin.end();
    }
  });
};

// ---------------- NORMALIZER ----------------
const normalize = (str) =>
  str.trim().replace(/\s+/g, " ");

// ---------------- COMPILE ----------------
const compileCode = async (tempDir, timelimit) => {
  const dockerDir = toDockerPath(tempDir);
  return runDocker([
    "run",
    "--rm",
    "-v",
    `${dockerDir}:/app`,
    "-w",
    "/app",
    "gcc:latest",
    "sh",
    "-c",
    `g++ main.cpp -o main`
  ]);
};

const runSingleTest = async (tc, dockerPath, timelimit) => {
  const dockerDir = toDockerPath(dockerPath);
  const result = await runDocker(
    [
      "run",
      "--rm",
      "--memory=256m",
      "--cpus=1",
      "--pids-limit=64",
      "--network=none",
      "--read-only",
      "--tmpfs",
      "/tmp",
      "-i",
      "-v",
      `${dockerDir}:/app`,
      "-w",
      "/app",
      "gcc:latest",
      "sh",
      "-c",
      `timeout ${timelimit}s ./main`
    ],
    tc.input
  );

  // ⏱️ Timeout
  if (result.code === 124) {
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
const evaluateParallel = async (testcases, dockerPath, timelimit) => {
  const promises = testcases.map((tc) =>
    limit(() => runSingleTest(tc, dockerPath, timelimit))
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
const runJudge = async (testcases, code, timelimit = 2) => {
  const tempId = uuid();
  const tempDir = path.join(process.cwd(), "temp", tempId);

  await fs.mkdir(tempDir, { recursive: true });

  const filePath = path.join(tempDir, "main.cpp");
  await fs.writeFile(filePath, code);

  try {
    // 🔨 Compile
    const compileResult = await compileCode(tempDir, timelimit);

    if (compileResult.code !== 0) {
      return {
        verdict: "CE",
        error: compileResult.stderr
      };
    }

    // ⚡ Parallel Execution
    return await evaluateParallel(testcases, tempDir, timelimit);

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

// ---------------- EXPORTS ----------------
export const runSample = async ({ testcases, timelimit }, code) => {
  if (!code || code.length > 50000) {
    return { verdict: "ERROR", error: "Invalid or too large code" };
  }
  return runJudge(testcases, code, timelimit);
};

export const runHidden = async ({ testcases, timelimit }, code) => {
  if (!code || code.length > 50000) {
    return { verdict: "ERROR", error: "Invalid or too large code" };
  }
  return runJudge(testcases, code, timelimit);
};