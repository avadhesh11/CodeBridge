import fs from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { spawn } from "child_process";
import pLimit from "p-limit";
import { Worker } from "bullmq";
import { connection, createRedisConnection } from "./queueService.js";

// Keep testcase parallelism low — each Docker run consumes ~80-100MB RAM.
// concurrency=2 means at most 2 testcases run in parallel per job (safe for 512MB containers).
const limit = pLimit(2);

const isWindows = process.platform === "win32";

const configs = {
  "C++": {
    filename: "main.cpp",
    image: "frolvlad/alpine-gxx:latest",
    compileCmd: "g++ -O2 main.cpp -o main",  // -O2 makes compiled binary run faster
    runCmd: "./main",
    nativeCompileCmd: isWindows ? "g++ -O2 main.cpp -o main.exe" : "g++ -O2 main.cpp -o main",
    nativeRunCmd: isWindows ? ".\\main.exe" : "./main"
  },
  "Python": {
    filename: "main.py",
    image: "python:3.9-slim",
    compileCmd: null,
    runCmd: "python -B main.py",
    nativeCompileCmd: null,
    nativeRunCmd: "python3 -B main.py"
  },
  "Java": {
    filename: "Main.java",
    image: "openjdk:17-jdk-slim",
    compileCmd: "javac Main.java",
    runCmd: "java -client Main",  // -client flag starts JVM faster (skips server JIT warmup)
    nativeCompileCmd: "javac Main.java",
    nativeRunCmd: "java -client Main"
  },
  "JavaScript": {
    filename: "main.js",
    image: "node:18-slim",
    compileCmd: null,
    runCmd: "node main.js",
    nativeCompileCmd: null,
    nativeRunCmd: "node main.js"
  }
};

// ---------------- IMAGE PRE-WARMER ----------------
// Run once at startup so the first user doesn't pay the image-pull/layer-unpack cost.
// docker run --rm <image> true  -->  starts + immediately exits; warms the image cache.
export const prewarmDockerImages = async () => {
  const docker = await isDockerAvailable();
  if (!docker) return;

  const images = [...new Set(Object.values(configs).map((c) => c.image))];
  console.log("[Prewarm] Warming Docker images:", images);

  for (const image of images) {
    try {
      await runProcess("docker", ["run", "--rm", "--log-driver=none", image, "true"], "", 60000);
      console.log(`[Prewarm] ✅ ${image} ready`);
    } catch {
      console.warn(`[Prewarm] ⚠️ Could not warm ${image}`);
    }
  }
};

// Convert Windows paths (E:\foo\bar) to Docker-compatible paths (/e/foo/bar)
const toDockerPath = (p) => {
  return p.replace(/\\/g, '/').replace(/^([A-Za-z]):/, (_, d) => `/${d.toLowerCase()}`);
};

const MAX_OUTPUT_SIZE = 1024 * 1024; // 1 MB limit to prevent output flooding

// ---------------- DOCKER DAEMON CHECK ----------------
let isDockerAvailableCache = null;
let lastDockerCheck = 0;
// Cache for 5 minutes — avoids spawning a "docker info" subprocess before every single job
const DOCKER_CHECK_TTL_MS = 5 * 60 * 1000;

const isDockerAvailable = async () => {
  const now = Date.now();
  if (isDockerAvailableCache !== null && now - lastDockerCheck < DOCKER_CHECK_TTL_MS) {
    return isDockerAvailableCache;
  }
  return new Promise((resolve) => {
    const proc = spawn("docker", ["info"]);
    const timer = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
      isDockerAvailableCache = false;
      lastDockerCheck = Date.now();
      resolve(false);
    }, 1500);

    proc.on("close", (code) => {
      clearTimeout(timer);
      isDockerAvailableCache = code === 0;
      lastDockerCheck = Date.now();
      resolve(isDockerAvailableCache);
    });

    proc.on("error", () => {
      clearTimeout(timer);
      isDockerAvailableCache = false;
      lastDockerCheck = Date.now();
      resolve(false);
    });
  });
};

// ---------------- PROCESS RUNNER ----------------
const runProcess = (cmd, args, input = "", timeoutMs = 15000, cwd = process.cwd()) => {
  return new Promise((resolve) => {
    let proc;
    try {
      if (cmd === "docker") {
        proc = spawn("docker", args);
      } else {
        proc = spawn(cmd, args, { cwd, shell: true });
      }
    } catch (err) {
      return resolve({ code: 1, stdout: "", stderr: err.message });
    }

    let stdout = "";
    let stderr = "";
    let isSettled = false;

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        try {
          proc.kill("SIGKILL");
        } catch {}
        resolve({ code: 124, stdout, stderr: "Time Limit Exceeded" });
      }
    }, timeoutMs);

    proc.stdout?.on("data", (data) => {
      if (stdout.length < MAX_OUTPUT_SIZE) {
        stdout += data.toString();
      }
    });

    proc.stderr?.on("data", (data) => {
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
        resolve({ code: 1, stdout, stderr: err.message });
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
  str ? str.trim().replace(/\s+/g, " ") : "";

// ---------------- COMPILE ----------------
const compileCode = async (tempDir, langConfig, useDocker) => {
  if (useDocker) {
    if (!langConfig.compileCmd) return { code: 0 };
    const tempId = path.basename(tempDir);
    const volumeName = process.env.TEMP_VOLUME_NAME;
    
    const dockerArgs = ["run", "--rm", "--log-driver=none"];
    if (volumeName) {
      dockerArgs.push("-v", `${volumeName}:/app`, "-w", `/app/${tempId}`);
    } else {
      const dockerDir = toDockerPath(tempDir);
      dockerArgs.push("-v", `${dockerDir}:/app`, "-w", "/app");
    }
    dockerArgs.push(langConfig.image, "sh", "-c", langConfig.compileCmd);
    return runProcess("docker", dockerArgs, "", 15000);
  } else {
    // Native compilation on host/Render container
    if (!langConfig.nativeCompileCmd) return { code: 0 };
    return runProcess(langConfig.nativeCompileCmd, [], "", 15000, tempDir);
  }
};

// ---------------- RUN SINGLE TESTCASE ----------------
const runSingleTest = async (tc, tempDir, langConfig, timelimit, useDocker) => {
  const sec = Math.max(1, parseInt(timelimit, 10) || 2);
  const maxWaitMs = (sec + 3) * 1000;
  let result;

  if (useDocker) {
    const tempId = path.basename(tempDir);
    const volumeName = process.env.TEMP_VOLUME_NAME;
    const dockerArgs = [
      "run",
      "--rm",
      "--log-driver=none",
      "--memory=128m",       // Reduced from 256m — leaves headroom on 512MB hosts
      "--memory-swap=128m",  // Disable swap to fail fast instead of thrashing
      "--cpus=0.5",          // Limit CPU to half a core per container
      "--pids-limit=32",
      "--network=none",
      "--read-only",
      "--tmpfs",
      "/tmp",
      "-i"
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
      `timeout -s 9 ${sec} ${langConfig.runCmd}`
    );

    result = await runProcess("docker", dockerArgs, tc.input, maxWaitMs);
  } else {
    // Native execution on Render / Linux / Host
    const execCmd = isWindows
      ? langConfig.nativeRunCmd
      : `timeout -s 9 ${sec} ${langConfig.nativeRunCmd}`;

    result = await runProcess(execCmd, [], tc.input, maxWaitMs, tempDir);
  }

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
      error: result.stderr || "Runtime error occurred",
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
const evaluateParallel = async (testcases, tempDir, langConfig, timelimit, useDocker) => {
  const promises = testcases.map((tc) =>
    limit(() => runSingleTest(tc, tempDir, langConfig, timelimit, useDocker))
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

// ---------------- FAIL-FAST SEQUENTIAL EVALUATION ----------------
// Stops at the first failing testcase instead of running all of them.
// This is faster in practice: most wrong solutions fail on TC1.
const evaluateFailFast = async (testcases, tempDir, langConfig, timelimit, useDocker) => {
  const results = [];

  for (const tc of testcases) {
    // eslint-disable-next-line no-await-in-loop
    const res = await runSingleTest(tc, tempDir, langConfig, timelimit, useDocker);
    results.push(res);

    // Stop immediately on TLE / RE / WA
    if (res.verdict === "TLE") return { verdict: "TLE", results: [] };
    if (res.verdict === "RE")  return { verdict: "RE", error: res.error, results };
    if (res.status === "WA")   return { verdict: "WA", results };
  }

  return { verdict: "AC", results };
};

// ---------------- MAIN JUDGE ----------------
const runJudge = async (testcases, code, language = "C++", timelimit = 2) => {
  const langConfig = configs[language] || configs["C++"];
  const tempId = uuid();
  const tempDir = path.join(process.cwd(), "temp", tempId);

  await fs.mkdir(tempDir, { recursive: true });

  // For JavaScript: ensure local commonjs scope
  if (language === "JavaScript") {
    await fs.writeFile(path.join(tempDir, "package.json"), JSON.stringify({ type: "commonjs" }));
  }

  const filePath = path.join(tempDir, langConfig.filename);
  await fs.writeFile(filePath, code);

  const useDocker = await isDockerAvailable();

  try {
    // 🔨 Compile
    const compileResult = await compileCode(tempDir, langConfig, useDocker);

    if (compileResult.code !== 0) {
      return {
        verdict: "CE",
        error: compileResult.stderr || "Compilation error"
      };
    }

    // ⚡ Fail-fast evaluation: stops at first wrong/TLE/RE testcase.
    // For sample runs (small TC count) this gives snappier feedback.
    // For hidden runs (AC needed on all TCs) fail-fast is also correct since
    // we report WA/TLE/RE anyway.
    return await evaluateFailFast(testcases, tempDir, langConfig, timelimit, useDocker);

  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
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
// ⚠️  concurrency: 1 is intentional.
// Each job spawns Docker containers. With concurrency > 1 on a 512MB host (Render free tier),
// you risk OOM-killing the entire service. One job at a time = stable execution.
export const executionWorker = new Worker(
  "executionQueue",
  async (job) => {
    const { testcases, code, language, timelimit } = job.data;
    try {
      console.log(`[Worker] Processing job ${job.id} — lang=${language}, tcs=${testcases?.length}`);
      return await runJudge(testcases, code, language, timelimit);
    } catch (err) {
      console.error("🔥 Worker execution crashed:", err);
      throw err;
    }
  },
  {
    connection: createRedisConnection("worker"),
    concurrency: 1,   // ONE job at a time — prevents Docker OOM on low-memory hosts
    skipVersionCheck: true,
    lockDuration: 120_000,  // 2-minute lock — covers even the slowest compilations
  }
);

executionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

executionWorker.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed with error:`, err);
});